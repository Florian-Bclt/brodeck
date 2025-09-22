import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// --- Helpers ---
function isHex16(s: string) {
  return /^[0-9a-f]{16}$/i.test(s);
}

// popcount pour 4 bits (0..15)
const POP4 = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];

// Hamming distance entre deux hex de 16 chars (64 bits)
function hammingHex64(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const na = parseInt(a[i], 16);
    const nb = parseInt(b[i], 16);
    const x = na ^ nb;          // XOR sur 4 bits
    dist += POP4[x];            // popcount 4 bits
  }
  return dist;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hash = (url.searchParams.get("hash") || "").trim().toLowerCase();
    const topK = Math.max(1, Math.min(10, Number(url.searchParams.get("topK") || 5)));
    const maxDistParam = url.searchParams.get("maxDist");
    const maxDist = maxDistParam != null ? Math.max(0, Math.min(64, Number(maxDistParam))) : null;

    if (!isHex16(hash)) {
      return NextResponse.json({ error: "invalid_hash", data: [] }, { status: 400 });
    }

    // Récupère les cartes avec empreinte
    const rows = await prisma.card.findMany({
      where: { imageDhash: { not: null } },
      select: { id: true, name: true, type: true, imageSmallUrl: true, imageDhash: true },
    });

    // Score local (distance de Hamming)
    const scored = rows
      .filter(r => r.imageDhash && isHex16(r.imageDhash))
      .map(r => {
        const dh = (r.imageDhash as string).toLowerCase();
        const dist = hammingHex64(hash, dh);
        return { ...r, distance: dist, score: 64 - dist };
      });

    if (!scored.length) return NextResponse.json({ data: [] }, { status: 200 });

    const filtered = maxDist != null ? scored.filter(s => s.distance <= maxDist) : scored;
    filtered.sort((a, b) => a.distance - b.distance);

    const best = filtered.slice(0, topK).map(({ imageDhash, ...rest }) => rest);
    return NextResponse.json({ data: best }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error", data: [] }, { status: 500 });
  }
}
