import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function run() {
  const [legal, limited, semi, banned, total] = await Promise.all([
    prisma.card.count({ where: { tcgBanStatus: "LEGAL" } }),
    prisma.card.count({ where: { tcgBanStatus: "LIMITED" } }),
    prisma.card.count({ where: { tcgBanStatus: "SEMI_LIMITED" } }),
    prisma.card.count({ where: { tcgBanStatus: "BANNED" } }),
    prisma.card.count(),
  ]);
  console.log({ legal, limited, semi, banned, total });
}
run().finally(() => prisma.$disconnect());
