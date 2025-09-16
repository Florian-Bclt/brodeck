// prisma/seed.ts (ou ton chemin actuel)
import { PrismaClient } from "../src/generated/prisma";
import crypto from "node:crypto";

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
  level?: number;            // Level (ou Rank pour les XYZ)
  attribute?: string;
  // ---- champs Link spécifiques retournés seulement pour les Link Monsters
  linkval?: number;          // <-- valeur de Lien
  linkmarkers?: string[];    // <-- non utilisé ici, mais dispo
  // ---- médias & divers
  card_images?: { image_url: string; image_url_small: string; image_url_cropped?: string }[];
  banlist_info?: { ban_tcg?: string };
};

function parseBan(val?: string): BanStatus {
  const s = (val ?? "").trim().toLowerCase();
  if (s === "forbidden" || s === "banned") return "BANNED";
  if (s === "limited") return "LIMITED";
  if (s === "semilimited") return "SEMI_LIMITED";
  return "LEGAL";
}

function hashCard(c: YgoCard): string {
  // IMPORTANT : n’ajoute 'linkval' au hash que s’il existe pour éviter
  // de re-hasher toutes les cartes non-Link inutilement.
  const obj: Record<string, any> = {
    id: c.id, name: c.name, type: c.type, frameType: c.frameType, desc: c.desc,
    race: c.race, archetype: c.archetype, atk: c.atk, def: c.def, level: c.level,
    attribute: c.attribute, img: c.card_images?.[0] ?? null,
    ban_tcg: c.banlist_info?.ban_tcg ?? null,
  };
  if (typeof c.linkval === "number") obj.linkval = c.linkval;

  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

async function main() {
  console.log("Fetching YGOPRODeck full dump…");
  const res = await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes&sort=id", { cache: "no-store" });
  if (!res.ok) throw new Error(`YGOPRODeck fetch failed: ${res.status}`);
  const json = await res.json();
  const data: YgoCard[] = json?.data ?? [];
  console.log(`Total cards: ${data.length}`);

  const BATCH = 300;
  for (let i = 0; i < data.length; i += BATCH) {
    const slice = data.slice(i, i + BATCH);
    const ids = slice.map((c) => c.id);

    const existing = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, contentHash: true },
    });
    const existingMap = new Map(existing.map((e) => [e.id, e.contentHash ?? ""]));

    const ops = slice.map((c) => {
      const h = hashCard(c);
      const img = c.card_images?.[0];
      const tcgBanStatus: BanStatus = parseBan(c.banlist_info?.ban_tcg);

      const isSame = existingMap.get(c.id) === h;
      if (isSame) return Promise.resolve(null);

      // Détection “classe”
      const frame = (c.frameType ?? "").toLowerCase();
      const typeLower = (c.type ?? "").toLowerCase();
      const isLink = frame.includes("link") || typeLower.includes("link");
      const isXyz  = frame.includes("xyz")  || typeLower.includes("xyz");

      // Champs calculés
      const linkVal: number | null = isLink && typeof c.linkval === "number" ? c.linkval : null;
      const rankVal: number | null = isXyz && typeof c.level === "number" ? c.level : null;

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
          level: c.level ?? null,       // XYZ: la valeur de Rank est stockée ici par l’API
          rank: rankVal,                // + on remplit aussi rank pour les XYZ
          link: linkVal,                // <-- NOUVEAU : on remplit depuis linkval
          attribute: c.attribute ?? null,
          imageUrl: img?.image_url ?? null,
          imageSmallUrl: img?.image_url_small ?? null,
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
          rank: rankVal,                // (ré)aligne si carte est XYZ
          link: linkVal,                // (ré)aligne si carte est Link
          attribute: c.attribute ?? null,
          imageUrl: img?.image_url ?? null,
          imageSmallUrl: img?.image_url_small ?? null,
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

  // Petits checks utiles
  const total = await prisma.card.count();
  const linkTotal = await prisma.card.count({ where: { frameType: "link" } });
  const linkWithVal = await prisma.card.count({ where: { frameType: "link", link: { not: null } } });
  const xyzTotal = await prisma.card.count({ where: { frameType: "xyz" } });
  const xyzWithRank = await prisma.card.count({ where: { frameType: "xyz", rank: { not: null } } });

  console.log({ total, linkTotal, linkWithVal, xyzTotal, xyzWithRank });

  const counts = await prisma.card.groupBy({ by: ["tcgBanStatus"], _count: { tcgBanStatus: true } });
  console.log("BanStatus:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
