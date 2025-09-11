import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma"; // ✅ singleton conseillé
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(60, Math.max(1, Number(url.searchParams.get("pageSize") || 30)));

  // Filtres
  const cardType = (url.searchParams.get("cardType") || "ALL").toUpperCase(); // ALL | MONSTER | SPELL | TRAP
  const monsterClass = (url.searchParams.get("monsterClass") || "").trim();
  const race = (url.searchParams.get("race") || "").trim();
  const attribute = (url.searchParams.get("attribute") || "").trim();
  const spellSubtype = (url.searchParams.get("spellSubtype") || "").trim();
  const trapSubtype  = (url.searchParams.get("trapSubtype")  || "").trim();

  const levelMin = Number(url.searchParams.get("levelMin") || NaN);
  const levelMax = Number(url.searchParams.get("levelMax") || NaN);
  const atkMin   = Number(url.searchParams.get("atkMin")   || NaN);
  const atkMax   = Number(url.searchParams.get("atkMax")   || NaN);
  const defMin   = Number(url.searchParams.get("defMin")   || NaN);
  const defMax   = Number(url.searchParams.get("defMax")   || NaN);

  const stock = (url.searchParams.get("stock") || "all").toLowerCase(); // all | owned | unowned
  const ban   = (url.searchParams.get("ban")   || "any").toLowerCase(); // any | legal | limited | semi_limited | banned

  // Helpers
  const AND: Prisma.CardWhereInput[] = [];
  const addNumRange = (field: "level" | "atk" | "def", min: number, max: number) => {
    const f: Prisma.IntNullableFilter = {};
    if (!Number.isNaN(min)) f.gte = min;
    if (!Number.isNaN(max)) f.lte = max;
    if (Object.keys(f).length) AND.push({ [field]: f } as Prisma.CardWhereInput);
  };

  // Recherche plein texte
  if (q) AND.push({ name: { contains: q, mode: Prisma.QueryMode.insensitive } });

  // Banlist via enum tcgBanStatus
  if (ban !== "any") {
    const map: Record<string, Prisma.CardWhereInput> = {
      legal:        { tcgBanStatus: "LEGAL" },
      limited:      { tcgBanStatus: "LIMITED" },
      semi_limited: { tcgBanStatus: "SEMI_LIMITED" },
      banned:       { tcgBanStatus: "BANNED" },
    };
    if (map[ban]) AND.push(map[ban]);
  }

  // Type global
  if (cardType === "MONSTER") {
    AND.push({ type: { contains: "Monster", mode: Prisma.QueryMode.insensitive } });
  } else if (cardType === "SPELL") {
    AND.push({ type: { equals: "Spell Card" } });
  } else if (cardType === "TRAP") {
    AND.push({ type: { equals: "Trap Card" } });
  }

  // Monstres: classe / race / attribut
  if (cardType === "MONSTER" && monsterClass) {
    AND.push({ type: { contains: monsterClass, mode: Prisma.QueryMode.insensitive } });
  }
  if (cardType === "MONSTER" && race) {
    AND.push({ race: { equals: race, mode: Prisma.QueryMode.insensitive } });
  }
  if (cardType === "MONSTER" && attribute) {
    AND.push({ attribute: { equals: attribute, mode: Prisma.QueryMode.insensitive } });
  }

  // Spell/Trap: sous-types (via race)
  if (cardType === "SPELL" && spellSubtype) {
    AND.push({ race: { equals: spellSubtype, mode: Prisma.QueryMode.insensitive } });
  }
  if (cardType === "TRAP" && trapSubtype) {
    AND.push({ race: { equals: trapSubtype, mode: Prisma.QueryMode.insensitive } });
  }

  // Niveaux & stats
  if (cardType === "MONSTER") {
    addNumRange("level", levelMin, levelMax);
    addNumRange("atk",   atkMin,   atkMax);
    addNumRange("def",   defMin,   defMax);
  }

  // Stock (en fonction de l'utilisateur connecté)
  if ((stock === "owned" || stock === "unowned") && userId) {
    if (stock === "owned") {
      AND.push({ ownerships: { some: { userId, qty: { gt: 0 } } } });
    } else {
      AND.push({ ownerships: { none: { userId, qty: { gt: 0 } } } });
    }
  }

  const where: Prisma.CardWhereInput = AND.length ? { AND } : {};
  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({
      where,
      select: { id: true, name: true, type: true, imageSmallUrl: true },
      orderBy: { id: "asc" },
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: rows });
}
