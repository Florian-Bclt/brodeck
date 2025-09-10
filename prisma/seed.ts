import { PrismaClient } from '../src/generated/prisma';
import crypto from "node:crypto";

const prisma = new PrismaClient();

type YgoCard = {
  id: number;
  name: string;
  type?: string;
  frameType?: string;
  desc?: string;
  race?: string;
  archetype?: string;
  atk?: number; def?: number; level?: number; attribute?: string;
  card_images?: { image_url: string; image_url_small: string }[];
  // autres champs ignorés pour le moment (card_sets, card_prices, misc_info, etc.)
};

function hashCard(c: YgoCard): string {
  // Hash stable basé sur les champs qu’on persiste
  const payload = JSON.stringify({
    id: c.id, name: c.name, type: c.type, frameType: c.frameType, desc: c.desc,
    race: c.race, archetype: c.archetype, atk: c.atk, def: c.def, level: c.level,
    attribute: c.attribute, img: c.card_images?.[0],
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

    // 1) Préparer une map des hashes existants pour éviter des writes inutiles
    const ids = slice.map(c => c.id);
    const existing = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, contentHash: true },
    });
    const existingMap = new Map(existing.map((e: { id: any; contentHash: any; }) => [e.id, e.contentHash ?? ""]));

    // 2) Upserts uniquement si le hash change (ou si new)
    const ops = slice.map(c => {
      const h = hashCard(c);
      const img = c.card_images?.[0];

      const isSame = existingMap.get(c.id) === h;
      if (isSame) {
        // rien à faire -> renvoyer une promesse résolue
        return Promise.resolve(null);
      }

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
          contentHash: h,
          lastSyncedAt: new Date(),
          rawJson: c as any,
        },
      });
    });

    // 3) Exécuter en parallèle, mais batch par batch pour ne pas saturer
    await Promise.all(ops);
    console.log(`Upserted batch ${i}-${i + slice.length - 1}`);
  }

  // (Optionnel) créer un user de test si absent
  await prisma.user.upsert({
    where: { email: "demo@asso.local" },
    create: { email: "demo@asso.local", name: "Demo User" },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
