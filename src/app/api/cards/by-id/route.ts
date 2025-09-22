import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || "");
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
  const row = await prisma.card.findMany({
    where: { id },
    select: { id: true, name: true, type: true, imageSmallUrl: true },
    take: 5,
  });
  return NextResponse.json({ data: row });
}
