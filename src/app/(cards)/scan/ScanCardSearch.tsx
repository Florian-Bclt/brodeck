"use client";

import { CardRow } from "@/types/cards";
import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

export default function ScanCardSearch() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text?: string; passcode?: string; hits?: CardRow[] } | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError("Impossible d'accéder à la caméra (HTTPS requis, permissions, appareil…).");
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function scan() {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    setError(null);
    setResult(null);

    // 1) Capture frame
    const video = videoRef.current;
    const cw = video.videoWidth;
    const ch = video.videoHeight;
    const canvas = canvasRef.current!;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, cw, ch);

    // ROI helper
    const crop = (xPct: number, yPct: number, wPct: number, hPct: number) => {
      const x = Math.round(cw * xPct);
      const y = Math.round(ch * yPct);
      const w = Math.round(cw * wPct);
      const h = Math.round(ch * hPct);
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      out.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      return out;
    };

    // 2) ROIs
    const nameROI = crop(0.06, 0.05, 0.88, 0.18); // haut
    const codeROI = crop(0.55, 0.84, 0.40, 0.13); // bas droit

    // 3) OCR (v5/v6 API)
    const worker = await createWorker("eng", undefined, { logger: () => {} });
    try {
      // --- Passcode: uniquement chiffres, PSM ligne
      await (worker as any).setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: "7", // single text line
      });
      const codeRes = await worker.recognize(codeROI);
      const digits = (codeRes.data.text || "").replace(/\D+/g, "");
      const passcode = digits.match(/\d{8,10}/)?.[0] || "";

      // --- Nom: garder espaces, PSM ligne
      await (worker as any).setParameters({
        tessedit_char_whitelist: "",            // reset
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "7",
      });
      const nameRes = await worker.recognize(nameROI);
      let nameText = (nameRes.data.text || "")
        .split("\n").map(s => s.trim()).filter(Boolean)[0] || "";
      nameText = nameText.replace(/\s{2,}/g, " ").trim();

      // Recherche
      let hits: CardRow[] = [];
      if (passcode.length >= 8) {
        const byId = await fetch(`/api/cards/by-id?id=${passcode}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null).catch(() => null);
        if (byId?.data?.length) hits = byId.data;
      }
      if (!hits.length && nameText) {
        const sp = new URLSearchParams({ page: "1", pageSize: "30", q: nameText });
        const res = await fetch(`/api/cards?${sp.toString()}`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          hits = j?.data ?? [];
        }
      }
      setResult({ text: nameText || undefined, passcode: passcode || undefined, hits });
    } catch {
      setError("Échec OCR. Essaie d'améliorer l'éclairage et le cadrage.");
    } finally {
      await worker.terminate();
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl text-white">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-[6%] top-[5%] h-[18%] rounded-md border-2 border-emerald-400/70"></div>
        <div className="pointer-events-none absolute right-[6%] bottom-[3%] h-[13%] w-[40%] rounded-md border-2 border-amber-400/70"></div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={scan} disabled={busy} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60">
          {busy ? "Scan en cours…" : "Scanner la carte"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {result && (
        <div className="mt-4 space-y-2">
          <div className="text-sm opacity-80">
            {result.passcode ? <>Passcode: <b>{result.passcode}</b> • </> : null}
            {result.text ? <>Nom: <b>{result.text}</b></> : null}
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {result.hits?.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex gap-3">
                  {c.imageSmallUrl ? <img src={c.imageSmallUrl} alt={c.name} className="h-28 w-20 rounded object-cover" /> : <div className="h-28 w-20 rounded bg-white/10" />}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="truncate text-xs opacity-70">{c.type ?? " "}</div>
                    <div className="text-xs opacity-60">#{c.id}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!result.hits?.length && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm opacity-80">Aucun résultat.</div>}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
