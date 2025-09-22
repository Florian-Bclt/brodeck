import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/translate
 * Body: { q: string, to?: "en" }  (source auto)
 * Providers supportés:
 * - DeepL:     process.env.DEEPL_API_KEY
 * - LibreTrans: process.env.LIBRETRANSLATE_URL (ex: https://libretranslate.com)
 */
export async function POST(req: NextRequest) {
  try {
    const { q, to = "en" } = await req.json();
    if (!q || typeof q !== "string") {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const deeplKey = process.env.DEEPL_API_KEY;
    const libreUrl = process.env.LIBRETRANSLATE_URL;

    // 1) DeepL si dispo
    if (deeplKey) {
      const r = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: {
          "Authorization": `DeepL-Auth-Key ${deeplKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ text: q, target_lang: to.toUpperCase() }),
      });
      if (r.ok) {
        const j = await r.json();
        const out = j?.translations?.[0]?.text;
        if (out) return NextResponse.json({ text: out }, { status: 200 });
      }
    }

    // 2) LibreTranslate si dispo
    if (libreUrl) {
      const r = await fetch(`${libreUrl.replace(/\/+$/, "")}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, source: "auto", target: to, format: "text" }),
      });
      if (r.ok) {
        const j = await r.json();
        const out = j?.translatedText;
        if (out) return NextResponse.json({ text: out }, { status: 200 });
      }
    }

    // 3) Pas de provider / échec → pas de traduction
    return NextResponse.json({ text: null }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ text: null }, { status: 200 });
  }
}
