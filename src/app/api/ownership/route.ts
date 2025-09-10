import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Pour l’instant, on utilise un user "demo" (remplacera plus tard NextAuth)
function getUserId(req: NextRequest) {
  return req.headers.get("x-user-id") || "demo-user";
}

// GET /api/ownership?query=magician
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const q = new URL(req.url).searchParams.get("query")?.trim() || "";

  let where: Prisma.OwnershipWhereInput = { userId };
  if (q) {
    where = {
      userId,
      card: {
        name: { contains: q, mode: Prisma.QueryMode.insensitive },
      },
    };
  }

  const rows = await prisma.ownership.findMany({
    where,
    include: { card: { select: { name: true, imageSmallUrl: true } } },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return NextResponse.json(
    rows.map((r) => ({
      cardId: r.cardId,
      name: r.card.name,
      image: r.card.imageSmallUrl,
      qty: r.qty,
      updatedAt: r.updatedAt,
    }))
  );
}

// POST /api/ownership { cardId:number, qty:number, note?:string }
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = (await req.json().catch(() => null)) as {
    cardId?: number;
    qty?: number;
    note?: string;
  };

  if (!body || typeof body.cardId !== "number" || typeof body.qty !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const exists = await prisma.card.findUnique({
    where: { id: body.cardId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const row = await prisma.ownership.upsert({
    where: { userId_cardId: { userId, cardId: body.cardId } },
    create: { userId, cardId: body.cardId, qty: Math.max(0, body.qty), note: body.note ?? null },
    update: { qty: Math.max(0, body.qty), note: body.note ?? null },
  });

  return NextResponse.json({ ok: true, cardId: row.cardId, qty: row.qty });
}
