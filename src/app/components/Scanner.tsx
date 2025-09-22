"use client";

import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

type ScanResult = { name: string };

type ArtCandidate = {
  id: number;
  name: string;
  type?: string | null;
  imageSmallUrl?: string | null;
  distance: number; // 0..64 (petit = proche)
  score: number;    // 64 - distance (grand = proche)
};

export function ScannerModal({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (res: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artHits, setArtHits] = useState<ArtCandidate[] | null>(null);

  // Caméra on/off
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      if (!open) return;
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
        setError("Accès caméra refusé (HTTPS/permissions/appareil).");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  // dHash 64-bit (16 hex) depuis un canvas
  function computeDhashFromCanvas(src: HTMLCanvasElement): string | null {
    try {
      const w = 9, h = 8;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d")!;
      g.drawImage(src, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data; // RGBA
      const gray = new Uint8Array(w * h);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
      }
      const bits: number[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w - 1; x++) {
          const l = gray[y * w + x];
          const r = gray[y * w + x + 1];
          bits.push(l < r ? 1 : 0);
        }
      }
      let hex = "";
      for (let i = 0; i < 64; i += 4) {
        const n = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
        hex += n.toString(16);
      }
      return hex;
    } catch {
      return null;
    }
  }

  async function scan() {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    setError(null);
    setArtHits(null);

    const video = videoRef.current;
    const cw = video.videoWidth || 720;
    const ch = video.videoHeight || 1280;

    const canvas = canvasRef.current!;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, cw, ch);

    // Helper crop
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

    const nameROI = crop(0.08, 0.05, 0.84, 0.16);
    const artROI  = crop(0.12, 0.22, 0.76, 0.42);

    // 1) OCR nom uniquement
    let name: string | undefined;
    try {
      const worker = await createWorker("eng", undefined, { logger: () => {} });
      await (worker as any).setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "7",
      });
      const nameRes = await worker.recognize(nameROI);
      name = (nameRes.data.text || "")
        .split("\n").map((s: string) => s.trim()).filter(Boolean)[0] || undefined;
      await worker.terminate();
    } catch { /* on tentera artwork */ }

    // helper query
    async function hasTextHit(q: string): Promise<boolean> {
      const sp = new URLSearchParams({ page: "1", pageSize: "1", q });
      const r = await fetch(`/api/cards?${sp.toString()}`, { cache: "no-store" });
      if (!r.ok) return false;
      const j = await r.json();
      return !!j?.data?.length;
    }

    // 2) Recherche texte (nom OCR)
    if (name) {
      if (await hasTextHit(name)) {
        onResult({ name });
        setBusy(false);
        return;
      }

      // 3) Fallback traduction → anglais → re-try
      try {
        const tr = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: name, to: "en" }),
        }).then(r => r.json()).catch(() => ({ text: null }));

        const en = (tr?.text || "").trim();
        if (en && en.toLowerCase() !== name.toLowerCase()) {
          if (await hasTextHit(en)) {
            onResult({ name: en }); // on injecte la version EN (mieux pour la recherche)
            setBusy(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    // 4) Fallback artwork (dHash + /image-search)... (garde ton bloc actuel)
    const dhash = computeDhashFromCanvas(artROI);
    if (!dhash) {
      setError("Lecture impossible (reflets ?). Essaie un autre angle/éclairage.");
      setBusy(false);
      return;
    }

    try {
      const r = await fetch(`/api/cards/image-search?hash=${encodeURIComponent(dhash)}&topK=5&maxDist=14`, { cache: "no-store" });
      const j = await r.json();
      const hits: ArtCandidate[] = j?.data ?? [];
      if (!hits.length) {
        setError("Aucun match visuel trouvé.");
        setBusy(false);
        return;
      }
      const best = hits[0];
      if (best && typeof best.distance === "number" && best.distance <= 6) {
        onResult({ name: best.name });
        setBusy(false);
        return;
      }
      setArtHits(hits);
    } catch {
      setError("Erreur lors de la recherche par artwork.");
    } finally {
      setBusy(false);
    }
  }

  function pickCandidate(c: ArtCandidate) {
    onResult({ name: c.name });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Scanner une carte</h2>

        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {/* Guides */}
          <div className="pointer-events-none absolute inset-x-[8%] top-[5%] h-[16%] rounded-md border-2 border-emerald-400/70"></div>
          <div className="pointer-events-none absolute left-[12%] top-[22%] h-[42%] w-[76%] rounded-md border-2 border-cyan-400/60"></div>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={scan}
            disabled={busy}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Scan en cours…" : "Scanner"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-white/15 px-4 py-2">
            Fermer
          </button>
        </div>

        {/* Sélection des matches artwork (si nécessaire) */}
        {artHits && (
          <div className="mt-4">
            <div className="mb-2 text-sm opacity-80">
              Sélectionne la carte détectée (reconnaissance par artwork) :
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {artHits.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex gap-3">
                    {c.imageSmallUrl ? (
                      <img src={c.imageSmallUrl} alt={c.name} className="h-24 w-16 rounded object-cover" />
                    ) : (
                      <div className="h-24 w-16 rounded bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{c.name}</div>
                      <div className="text-xs opacity-70">{c.type ?? "\u00A0"}</div>
                      <div className="text-[11px] opacity-60">Distance: {c.distance}</div>
                      <button
                        onClick={() => pickCandidate(c)}
                        className="mt-2 rounded-lg bg-indigo-600 px-2 py-1 text-xs hover:bg-indigo-700"
                      >
                        Choisir
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs opacity-60">
              Astuce : si aucune n’est la bonne, réessaie avec un autre angle (évite les reflets/sleeves).
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
