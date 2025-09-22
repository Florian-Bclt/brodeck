import { PrismaClient } from "../src/generated/prisma";
import crypto from "node:crypto";
import sharp from "sharp";

const prisma = new PrismaClient();

type BanStatus = "LEGAL" | "LIMITED" | "SEMI_LIMITED" | "BANNED";

type YgoCard = {
  id: number;
  name: string;
  type?: string;
  frameType?: string;
  desc?: string;
  race?: string;
  archetype?: string;
  atk?: number;
  def?: number;
  level?: number;            // Level (Rank pour XYZ dans l'API)
  attribute?: string;

  // Spécifique Link
  linkval?: number;
  linkmarkers?: string[];

  // Médias
  card_images?: {
    image_url: string;
    image_url_small: string;
    image_url_cropped?: string; // <- artwork recadré (idéal pour dHash)
  }[];

  banlist_info?: { ban_tcg?: string };
};

function parseBan(val?: string): BanStatus {
  const s = (val ?? "").trim().toLowerCase();
  if (s === "forbidden" || s === "banned") return "BANNED";
  if (s === "limited") return "LIMITED";
  if (s === "semilimited") return "SEMI_LIMITED";
  return "LEGAL";
}

/** 64 bits -> 16 hex chars */
function bitsToHex64(bits: number[]): string {
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

/** dHash 64-bit à partir d’un buffer image */
async function computeDhashFromBuffer(buf: Buffer): Promise<string | null> {
  try {
    const w = 9, h = 8; // 9x8 pour 64 comparaisons horizontales
    const raw = await sharp(buf).grayscale().resize(w, h, { fit: "fill" }).raw().toBuffer();
    const bits: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w - 1; x++) {
        const l = raw[y * w + x];
        const r = raw[y * w + x + 1];
        bits.push(l < r ? 1 : 0);
      }
    }
    return bitsToHex64(bits);
  } catch {
    return null;
  }
}

async function fetchBuffer(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/** On inclut imageDhash & linkval dans le hash pour forcer l’upsert lors de l’ajout de ces données. */
function hashCard(c: YgoCard, extra: { linkval: number | null; imageDhash: string | null }) {
  const obj: Record<string, any> = {
    id: c.id, name: c.name, type: c.type, frameType: c.frameType, desc: c.desc,
    race: c.race, archetype: c.archetype, atk: c.atk, def: c.def, level: c.level,
    attribute: c.attribute, img: c.card_images?.[0] ?? null,
    ban_tcg: c.banlist_info?.ban_tcg ?? null,
    linkval: extra.linkval,         // <- new
    imageDhash: extra.imageDhash,   // <- new
  };
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

async function main() {
  console.log("Fetching YGOPRODeck full dump…");
  const res = await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes&sort=id", { cache: "no-store" });
  if (!res.ok) throw new Error(`YGOPRODeck fetch failed: ${res.status}`);
  const json = await res.json();
  const data: YgoCard[] = json?.data ?? [];
  console.log(`Total cards: ${data.length}`);

  const BATCH = 250;

  for (let i = 0; i < data.length; i += BATCH) {
    const slice = data.slice(i, i + BATCH);
    const ids = slice.map(c => c.id);

    const existing = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, contentHash: true, imageDhash: true },
    });
    const existingMap = new Map(existing.map(e => [e.id, e.contentHash ?? ""]));

    const ops = slice.map(async (c) => {
      const img = c.card_images?.[0];
      const tcgBanStatus: BanStatus = parseBan(c.banlist_info?.ban_tcg);

      // Détection classe
      const frame = (c.frameType ?? "").toLowerCase();
      const typeLower = (c.type ?? "").toLowerCase();
      const isLink = frame.includes("link") || typeLower.includes("link");
      const isXyz  = frame.includes("xyz")  || typeLower.includes("xyz");

      // Champs calculés
      const linkVal: number | null = isLink && typeof c.linkval === "number" ? c.linkval : null;
      const rankVal: number | null = isXyz && typeof c.level === "number" ? c.level : null;

      // dHash depuis l’artwork recadré (idéal), sinon petite image
      let imageDhash: string | null = null;
      const buf = await fetchBuffer(img?.image_url_cropped || img?.image_url_small);
      if (buf) imageDhash = await computeDhashFromBuffer(buf);

      // hash de contenu incluant linkval + imageDhash
      const h = hashCard(c, { linkval: linkVal, imageDhash });

      const isSame = existingMap.get(c.id) === h;
      if (isSame) return null;

      return prisma.card.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          type: c.type ?? null,
          frameType: c.frameType ?? null,
          desc: c.desc ?? null,
          race: c.race ?? null,
          archetype: c.archetype ?? null,
          atk: c.atk ?? null,
          def: c.def ?? null,
          level: c.level ?? null,    // XYZ: Rank se trouve aussi dans level côté API
          rank: rankVal,             // on duplique dans rank pour filtrage
          link: linkVal,             // Link depuis linkval
          attribute: c.attribute ?? null,

          imageUrl: img?.image_url ?? null,
          imageSmallUrl: img?.image_url_small ?? null,
          imageLargeUrl: null,       // si tu veux, récupère card_images[0].image_url (HD)
          imageDhash,                // <- NEW

          tcgBanStatus,
          contentHash: h,
          lastSyncedAt: new Date(),
          rawJson: c as any,
        },
        update: {
          name: c.name,
          type: c.type ?? null,
          frameType: c.frameType ?? null,
          desc: c.desc ?? null,
          race: c.race ?? null,
          archetype: c.archetype ?? null,
          atk: c.atk ?? null,
          def: c.def ?? null,
          level: c.level ?? null,
          rank: rankVal,
          link: linkVal,
          attribute: c.attribute ?? null,

          imageUrl: img?.image_url ?? null,
          imageSmallUrl: img?.image_url_small ?? null,
          imageLargeUrl: null,
          imageDhash,                // <- NEW

          tcgBanStatus,
          contentHash: h,
          lastSyncedAt: new Date(),
          rawJson: c as any,
        },
      });
    });

    await Promise.all(ops);
    console.log(`Upserted batch ${i}-${i + slice.length - 1}`);
  }

  console.log("Seed complete.");

  // Petits checks (case-insensitive pour frameType)
  const total = await prisma.card.count();
  const linkTotal = await prisma.card.count({ where: { frameType: { contains: "link", mode: "insensitive" } } });
  const linkWithVal = await prisma.card.count({
    where: { frameType: { contains: "link", mode: "insensitive" }, link: { not: null } },
  });
  const xyzTotal = await prisma.card.count({ where: { frameType: { contains: "xyz", mode: "insensitive" } } });
  const xyzWithRank = await prisma.card.count({
    where: { frameType: { contains: "xyz", mode: "insensitive" }, rank: { not: null } },
  });
  const dhashCount = await prisma.card.count({ where: { imageDhash: { not: null } } });

  console.log({ total, linkTotal, linkWithVal, xyzTotal, xyzWithRank, dhashCount });

  const counts = await prisma.card.groupBy({ by: ["tcgBanStatus"], _count: { tcgBanStatus: true } });
  console.log("BanStatus:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
