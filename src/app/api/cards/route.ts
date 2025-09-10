import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Math.min(60, Number(url.searchParams.get("pageSize") || 30));
  const skip = (page - 1) * pageSize;

  const where = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [total, rows] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({
      where,
      select: { id: true, name: true, type: true, imageSmallUrl: true },
      orderBy: [{ id: "asc" }],
      skip, take: pageSize
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: rows });
}
