import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("query")?.trim() || "";
  const cardIdsParam = searchParams.get("cardIds"); // "1,2,3"
  let where: Prisma.OwnershipWhereInput = { userId };

  if (cardIdsParam) {
    const ids = cardIdsParam
      .split(",")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    if (ids.length > 0) where = { userId, cardId: { in: ids } };
  } else if (q) {
    where = { userId, card: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } };
  }

  const rows = await prisma.ownership.findMany({
    where,
    select: { cardId: true, qty: true },
    orderBy: { updatedAt: "desc" },
    take: cardIdsParam ? undefined : 500, // limite de sécurité si recherche plein texte
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null) as { cardId?: number; qty?: number; note?: string | null };
  if (!body || typeof body.cardId !== "number" || typeof body.qty !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cardId = body.cardId;
  const qty = Math.max(0, Math.floor(body.qty));

  // s’assurer que la carte existe
  const exists = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const row = await prisma.ownership.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, qty, note: body.note ?? null },
    update: { qty, note: body.note ?? null },
  });

  return NextResponse.json({ ok: true, cardId: row.cardId, qty: row.qty });
}
