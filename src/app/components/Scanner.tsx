"use client";

import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

type ScanResult = { name: string };

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
  const [lastOCR, setLastOCR] = useState<string>("");

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
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [open]);

  // Prétraitement simple: upscale x2 + niveaux (binarisation légère)
  function preprocessForOCR(src: HTMLCanvasElement): HTMLCanvasElement {
    const w = Math.max(1, Math.floor(src.width * 2));
    const h = Math.max(1, Math.floor(src.height * 2));
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const g = out.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    // grayscale + contraste/threshold léger
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // boost contrast
      const c = Math.max(0, Math.min(255, (gray - 128) * 1.2 + 128));
      const v = c > 155 ? 255 : (c < 90 ? 0 : c); // pseudo-threshold doux
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    return out;
  }

  async function scan() {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    setError(null);
    setLastOCR("");

    const video = videoRef.current;
    const cw = video.videoWidth || 720;
    const ch = video.videoHeight || 1280;

    const canvas = canvasRef.current!;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, cw, ch);

    // Helper crop (%)
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

    // ROI du nom (ajuste si besoin selon ton cadrage)
    const nameROI = crop(0.08, 0.05, 0.84, 0.16);
    const pre = preprocessForOCR(nameROI);

    // 1) OCR du nom (pas de passcode)
    let name: string | undefined;
    try {
      const worker = await createWorker("eng"); // ok pour lire les caractères latins
      await (worker as any).setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "7", // single line
      });
      const res = await worker.recognize(pre);
      await worker.terminate();

      const raw = (res?.data?.text || "")
        .split("\n").map((s: string) => s.trim()).filter(Boolean)[0] || "";
      // Nettoyage léger (double espaces, tirets étranges)
      name = raw.replace(/\s{2,}/g, " ").replace(/[–—]/g, "-").trim();
      setLastOCR(name);
    } catch {
      // pas d'OCR → on va juste afficher une erreur après tentative
    }

    // Petit helper: test de la recherche serveur
    async function hasTextHit(q: string): Promise<boolean> {
      const sp = new URLSearchParams({ page: "1", pageSize: "1", q });
      const r = await fetch(`/api/cards?${sp.toString()}`, { cache: "no-store" });
      if (!r.ok) return false;
      const j = await r.json();
      return !!j?.data?.length;
    }

    // 2) Recherche texte directe
    if (name && await hasTextHit(name)) {
      onResult({ name });
      setBusy(false);
      return;
    }

    // 3) Fallback TRADUCTION → EN puis re-try (via /api/translate)
    if (name) {
      try {
        const tr = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: name, to: "en" }),
        }).then(r => r.json()).catch(() => ({ text: null }));

        const en = (tr?.text || "").trim();
        if (en && en.toLowerCase() !== name.toLowerCase()) {
          if (await hasTextHit(en)) {
            onResult({ name: en });
            setBusy(false);
            return;
          }
        }
      } catch { /* ignore, on tombera sur le message d’erreur */ }
    }

    setError("Aucun résultat avec le nom détecté. Essaie de recadrer le titre, éviter les reflets/sleeves, ou retaper le nom.");
    setBusy(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Scanner une carte</h2>

        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {/* Guide: zone du nom */}
          <div className="pointer-events-none absolute inset-x-[8%] top-[5%] h-[16%] rounded-md border-2 border-emerald-400/70"></div>
        </div>

        {lastOCR && (
          <div className="mt-2 text-xs opacity-80">
            Nom détecté : <b>{lastOCR}</b>
          </div>
        )}
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

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
