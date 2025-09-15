// app/api/import/ownership/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// util: normalisation basique
const norm = (s?: string | null) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’`"]/g, "")
    .replace(/[-_–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type PreviewRow = {
  rowIndex: number;            // 1-based (feuille)
  frName?: string | null;      // Col A
  enName?: string | null;      // Col B
  cardType?: string | null;    // Col C (type carte: Monster/Spell/Trap)
  monsterRace?: string | null; // Col D (ex: Spellcaster, Dragon…)
  qty: number;
  // suggestions
  status: "exact" | "fuzzy" | "ambiguous" | "not_found";
  confidence: number; // 0..1
  suggestions: Array<{ cardId: number; name: string; type: string | null; race: string | null; score: number }>;
  chosenCardId?: number; // si l'algo est confiant
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dryRun = (searchParams.get("dryRun") ?? "1") === "1";

  // 2 modes d'entrée :
  // - dryRun=1: multipart file => on parse ODS/XLSX
  // - dryRun=0: JSON { rows: [{ rowIndex, qty, chosenCardId }...] } => on applique
  if (!dryRun) {
    const body = await req.json().catch(() => null) as { rows: Array<{ qty: number; chosenCardId: number }>} | null;
    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
    }

    // Appliquer
    const ops = body.rows
      .filter(r => r.chosenCardId && Number.isFinite(r.qty) && r.qty >= 0)
      .map(r => prisma.ownership.upsert({
        where: { userId_cardId: { userId, cardId: r.chosenCardId } },
        update: { qty: r.qty },
        create: { userId, cardId: r.chosenCardId, qty: r.qty },
      }));

    await prisma.$transaction(ops);
    return NextResponse.json({ ok: true, updated: ops.length });
  }

  // PREVIEW: on lit le fichier
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Fichier manquant (clé 'file')" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null });

  // Détection souple des entêtes
  // A: Nom FR, B: Nom EN, C: Type carte (Monster/Spell/Trap), D: Type de monstre (race), E: Quantité
  const headerMap = (headers: string[]) => {
    const H = headers.map(h => norm(h));
    const idx = (needle: RegExp) => H.findIndex(h => needle.test(h));

    return {
      fr:  idx(/nom.*fr/),
      en:  idx(/nom.*en|english|angl/),
      ctype: idx(/type.*carte|carte.*type|card.*type/),
      race: idx(/type.*monstre|race|monster.*(type|race)/),
      qty:  idx(/qte|quantite|qty|quantity|nombre/),
    };
  };

  const first = json[0] as Record<string, any> | undefined;
  if (!first) return NextResponse.json({ rows: [] });

  const headers = Object.keys(first);
  const cols = headerMap(headers);

  const rows: PreviewRow[] = [];
  let rowIndex = 1; // pour info utilisateur

  for (const r of json as Array<Record<string, any>>) {
    const frName = cols.fr >= 0 ? (r[headers[cols.fr]] ?? null) : null;
    const enName = cols.en >= 0 ? (r[headers[cols.en]] ?? null) : null;
    const cardType = cols.ctype >= 0 ? (r[headers[cols.ctype]] ?? null) : null;
    const monsterRace = cols.race >= 0 ? (r[headers[cols.race]] ?? null) : null;

    let qtyRaw = cols.qty >= 0 ? r[headers[cols.qty]] : null;
    const qty = Math.max(0, Number(qtyRaw ?? 0)) || 0;

    const preview: PreviewRow = {
      rowIndex: rowIndex++,
      frName, enName, cardType, monsterRace, qty,
      status: "not_found",
      confidence: 0,
      suggestions: [],
    };

    const qEn = norm(typeof enName === "string" ? enName : "");
    const qRace = norm(typeof monsterRace === "string" ? monsterRace : "");
    const qType = norm(typeof cardType === "string" ? cardType : "");

    if (!qEn && !qRace) {
      rows.push(preview);
      continue;
    }

    // 1) Essai EXACT insensible accents/casse
    if (qEn) {
      const exact = await prisma.$queryRaw<
        Array<{ id: number; name: string; type: string | null; race: string | null }>
      >`
        SELECT id, name, type, race
        FROM "Card"
        WHERE unaccent(lower(name)) = unaccent(lower(${enName}::text))
        LIMIT 1;
      `;

      if (exact.length) {
        const card = exact[0];
        // Si file donne une race, on vérifie la cohérence, sinon on accepte
        const okRace = !qRace || norm(card.race || "") === qRace;
        if (okRace) {
          preview.status = "exact";
          preview.confidence = 1;
          preview.suggestions = [{ cardId: card.id, name: card.name, type: card.type, race: card.race, score: 1 }];
          preview.chosenCardId = card.id;
          rows.push(preview);
          continue;
        }
      }
    }

    // 2) Fuzzy via pg_trgm (distance + similarité)
    // On prépare un WHERE optionnel sur race / type
    // Note: pour les Magies/Pièges, la "race" c'est souvent le sous-type (Quick-Play, Continuous, etc.)
    const limit = 5;
    const qNorm = qEn; // qEn = norm(enName)

    const fuzzy = await prisma.$queryRaw<
      Array<{ id: number; name: string; type: string | null; race: string | null; dist: number; sim: number }>
    >`
      SELECT id, name, type, race,
            ("nameSearch" <-> ${qNorm}) AS dist,
            similarity("nameSearch", ${qNorm}) AS sim
      FROM "Card"
      WHERE (${qType === ""} OR
            (${qType} = 'monster' AND type ILIKE '%Monster%') OR
            (${qType} = 'spell'   AND type = 'Spell Card') OR
            (${qType} = 'trap'    AND type = 'Trap Card'))
        AND (${qRace === ""} OR unaccent(lower(coalesce(race,''))) = ${qRace})
      ORDER BY dist ASC, sim DESC
      LIMIT ${limit};
    `;

    // Scoring simple: on favorise dist faible (0 parfait) et sim élevée
    const scored = fuzzy.map(x => ({
      cardId: x.id,
      name: x.name,
      type: x.type,
      race: x.race,
      score: Math.max(0, 1 - x.dist) * 0.7 + x.sim * 0.3,
    }));

    if (scored.length === 0) {
      preview.status = "not_found";
      preview.confidence = 0;
      rows.push(preview);
      continue;
    }

    // Filtre léger: on accepte si top score >> second score, et score raisonnable
    const [top, second] = scored;
    preview.suggestions = scored;

    if (!second || top.score >= 0.92 || (top.score >= 0.85 && top.score - second.score >= 0.08)) {
      preview.status = "fuzzy";
      preview.confidence = Math.min(1, top.score);
      preview.chosenCardId = top.cardId;
    } else {
      preview.status = "ambiguous";
      preview.confidence = top.score;
    }

    rows.push(preview);
  }

  return NextResponse.json({ rows });
}
