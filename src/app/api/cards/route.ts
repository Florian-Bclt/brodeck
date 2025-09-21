import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(60, Math.max(1, Number(url.searchParams.get("pageSize") || 100)));

  // === Params ===
  const cardType = (url.searchParams.get("cardType") || "ALL").toUpperCase(); // ALL | MONSTER | SPELL | TRAP

  // Classe (sur 'type') : "Effect","Normal","Ritual","Fusion","Synchro","Xyz","Link","Pendulum"
  const monsterClass = (url.searchParams.get("monsterClass") || "").trim();

  // Race (sur 'race') : "Spellcaster","Dragon", ...
  const raceParam = (url.searchParams.get("race") || "").trim();

  const attribute = (url.searchParams.get("attribute") || "").trim();

  // Pour Spell/Trap, 'race' côté source = sous-type
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

  const iMode = Prisma.QueryMode.insensitive;
  const AND: Prisma.CardWhereInput[] = [];

  // Helpers
  const makeIntRange = (min: number, max: number): Prisma.IntNullableFilter | undefined => {
    const f: Prisma.IntNullableFilter = {};
    if (!Number.isNaN(min)) f.gte = min;
    if (!Number.isNaN(max)) f.lte = max;
    return Object.keys(f).length ? f : undefined;
  };
  const addNumRange = (field: "atk" | "def", min: number, max: number) => {
    const f = makeIntRange(min, max);
    if (f) AND.push({ [field]: f } as Prisma.CardWhereInput);
  };

  // === Search
  if (q) AND.push({ name: { contains: q, mode: iMode } });

  // === Banlist
  if (ban !== "any") {
    const map: Record<string, Prisma.CardWhereInput> = {
      legal:        { tcgBanStatus: "LEGAL" },
      limited:      { tcgBanStatus: "LIMITED" },
      semi_limited: { tcgBanStatus: "SEMI_LIMITED" },
      banned:       { tcgBanStatus: "BANNED" },
    };
    if (map[ban]) AND.push(map[ban]);
  }

  // === Card type global
  if (cardType === "MONSTER") {
    AND.push({ type: { contains: "Monster", mode: iMode } });
  } else if (cardType === "SPELL") {
    AND.push({ type: { equals: "Spell Card" } });
  } else if (cardType === "TRAP") {
    AND.push({ type: { equals: "Trap Card" } });
  }

  // === Monster class (sur 'type')
  if (cardType === "MONSTER" && monsterClass) {
    AND.push({ type: { contains: monsterClass, mode: iMode } });
  }

  // === Race (sur 'race') — tolère tiret/espaces et casse
  if (raceParam) {
    const variants = [
      raceParam,
      raceParam.replace(/-/g, " "),
      raceParam.replace(/\s+/g, "-"),
    ];
    AND.push({
      OR: variants.map(v => ({ race: { equals: v, mode: iMode } })),
    });
  }

  // === Attribute (monstres)
  if (cardType === "MONSTER" && attribute) {
    AND.push({ attribute: { equals: attribute, mode: iMode } });
  }

  // === Spell/Trap subtypes (stockés dans 'race')
  if (cardType === "SPELL" && spellSubtype) {
    AND.push({ race: { equals: spellSubtype, mode: iMode } });
  }
  if (cardType === "TRAP" && trapSubtype) {
    AND.push({ race: { equals: trapSubtype, mode: iMode } });
  }

  if (cardType === "MONSTER" && (!Number.isNaN(levelMin) || !Number.isNaN(levelMax))) {
    const linkRange = makeIntRange(levelMin, levelMax);
    const lvlRange  = makeIntRange(levelMin, levelMax);

    const cls = monsterClass.toLowerCase();

    if (cls === "link") {
      // On ne regarde que 'link' (après reseed).
      if (linkRange) AND.push({ link: linkRange });
    } else if (cls === "xyz") {
      // Xyz ⇒ 'level' contient la valeur de Rank dans ton seed actuel.
      if (lvlRange) AND.push({ level: lvlRange });
    } else if (cls) {
      // Autres classes ⇒ 'level'
      if (lvlRange) AND.push({ level: lvlRange });
    } else {
      const orCases: Prisma.CardWhereInput[] = [];
      if (linkRange) {
        orCases.push({
          AND: [
            { frameType: { contains: "Link", mode: iMode } },
            { link: linkRange },
          ],
        });
      }
      if (lvlRange) {
        orCases.push({
          AND: [
            { frameType: { contains: "Xyz", mode: iMode } },
            { level: lvlRange },
          ],
        });
        orCases.push({
          AND: [
            { frameType: { contains: "Monster", mode: iMode } },
            { NOT: [{ frameType: { contains: "Link", mode: iMode } }, { frameType: { contains: "Xyz", mode: iMode } }] },
            { level: lvlRange },
          ],
        });
      }
      if (orCases.length) AND.push({ OR: orCases });
    }
  }

  // === ATK/DEF
  if (cardType === "MONSTER") {
    addNumRange("atk", atkMin, atkMax);
    addNumRange("def", defMin, defMax);
  }

  // === Stock lié à l'utilisateur
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
      select: {
        id: true,
        name: true,
        type: true,
        race: true,
        attribute: true,
        level: true,
        rank: true,
        link: true,
        imageSmallUrl: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: rows });
}
