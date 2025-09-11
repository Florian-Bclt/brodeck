import { PrismaClient } from "../src/generated/prisma";
import crypto from "node:crypto";

const prisma = new PrismaClient();

type BanStatus = "LEGAL" | "LIMITED" | "SEMI_LIMITED" | "BANNED";
type YgoCard = {
  id: number; name: string; type?: string; frameType?: string; desc?: string;
  race?: string; archetype?: string; atk?: number; def?: number; level?: number; attribute?: string;
  card_images?: { image_url: string; image_url_small: string }[];
  banlist_info?: { ban_tcg?: string };
};

function parseBan(val?: string): BanStatus {
  const s = (val ?? "")
    .trim()
    .toLowerCase()

  if (s === "forbidden" || s === "banned") return "BANNED";
  if (s === "limited") return "LIMITED";
  if (s === "semilimited") return "SEMI_LIMITED";
  return "LEGAL";
}

function hashCard(c: YgoCard): string {
  const payload = JSON.stringify({
    id: c.id, name: c.name, type: c.type, frameType: c.frameType, desc: c.desc,
    race: c.race, archetype: c.archetype, atk: c.atk, def: c.def, level: c.level,
    attribute: c.attribute, img: c.card_images?.[0],
    ban_tcg: c.banlist_info?.ban_tcg ?? null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
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
    const ids = slice.map(c => c.id);

    const existing = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, contentHash: true },
    });
    const existingMap = new Map(existing.map(e => [e.id, e.contentHash ?? ""]));

    const ops = slice.map(c => {
      const h = hashCard(c);
      const img = c.card_images?.[0];
      const tcgBanStatus: BanStatus = parseBan(c.banlist_info?.ban_tcg);

      const isSame = existingMap.get(c.id) === h;
      if (isSame) return Promise.resolve(null);

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
          level: c.level ?? null,
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

  const counts = await prisma.card.groupBy({
    by: ["tcgBanStatus"],
    _count: { tcgBanStatus: true },
  });
  console.log("BanStatus:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
