import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CardDetailDTO } from "@/types/cards";

export const dynamic = "force-dynamic"; // évite le cache côté Vercel si besoin

export async function GET(_req: NextRequest, context: any) {
  const id = Number(context.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Paramètre 'id' invalide" }, { status: 400 });
  }

  try {
    // Adapte les noms de champs aux tiens (model Prisma: Card)
    const card = await prisma.card.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,          // e.g. "Effect Monster", "Spell Card", ...
        attribute: true,     // e.g. "DARK", "LIGHT"
        race: true,          // e.g. "Spellcaster", "Dragon"
        atk: true,
        def: true,
        level: true,         // ou rank/linkRating selon tes colonnes; laisse null si non applicable
        desc: true,          // effet / texte de la carte
        imageSmallUrl: true,
        imageLargeUrl: true, // si tu n’as pas ce champ, laisse false et on fera un fallback côté client
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
    }

    // Normalisation légère (évite les chaînes vides)
    const toNull = (v: unknown) =>
      v === "" || v === undefined ? null : (v as any);

    const payload: CardDetailDTO = {
      id: card.id,
      name: card.name,
      type: toNull(card.type),
      attribute: toNull(card.attribute),
      race: toNull(card.race),
      atk: card.atk ?? null,
      def: card.def ?? null,
      level: card.level ?? null,
      desc: toNull(card.desc),
      imageSmallUrl: toNull(card.imageSmallUrl),
      imageLargeUrl: toNull(card.imageLargeUrl) || toNull(card.imageSmallUrl), // fallback
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store", // tu fais déjà fetch(..., { cache: "no-store" })
      },
    });
  } catch (err) {
    console.error("GET /api/cards/[id] failed:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
