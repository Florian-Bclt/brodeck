import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Somme des quantités > 0
  const result = await prisma.ownership.aggregate({
    _sum: { qty: true },
    where: { userId, qty: { gt: 0 } },
  });

  const totalOwned = result._sum.qty ?? 0;

  return NextResponse.json({ totalOwned });
}
