"use client";

import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

type ScanResult = { passcode?: string; name?: string };

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

    // ROIs (ajuste si besoin selon ton cadrage)
    const nameROI = crop(0.06, 0.05, 0.88, 0.18); // bande nom
    const codeROI = crop(0.55, 0.84, 0.40, 0.13); // passcode
    const artROI  = crop(0.12, 0.22, 0.76, 0.42); // artwork

    // 1) OCR
    let passcode: string | undefined;
    let name: string | undefined;
    try {
      const worker = await createWorker("eng");
      await (worker as any).setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: "7",
      });
      const codeRes = await worker.recognize(codeROI);
      const digits = (codeRes.data.text || "").replace(/\D+/g, "");
      passcode = digits.match(/\d{8,10}/)?.[0];

      await (worker as any).setParameters({
        tessedit_char_whitelist: "",
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "7",
      });
      const nameRes = await worker.recognize(nameROI);
      name = (nameRes.data.text || "")
        .split("\n").map((s: string) => s.trim()).filter(Boolean)[0] || undefined;

      await worker.terminate();
    } catch {
      // ignore, on tentera l’artwork
    }

    // 2) Passcode → /by-id → nom officiel
    if (passcode) {
      try {
        const byId = await fetch(`/api/cards/by-id?id=${passcode}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null).catch(() => null);
        const hit = byId?.data?.[0];
        if (hit?.name) {
          onResult({ name: hit.name });
          setBusy(false);
          return;
        }
      } catch {/* ignore */}
    }

    // 3) Nom OCR → vérifie qu’il y a au moins 1 hit texte
    if (name) {
      try {
        const sp = new URLSearchParams({ page: "1", pageSize: "1", q: name });
        const r = await fetch(`/api/cards?${sp.toString()}`, { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (j?.data?.length) {
          onResult({ name });
          setBusy(false);
          return;
        }
      } catch {/* ignore */}
    }

    // 4) Fallback artwork (dHash) → /image-search
    const dhash = computeDhashFromCanvas(artROI);
    if (!dhash) {
      setError("Lecture impossible (reflets ?). Essaie un autre angle/éclairage.");
      setBusy(false);
      return;
    }

    try {
      const r = await fetch(`/api/cards/image-search?hash=${encodeURIComponent(dhash)}&topK=5&maxDist=20`, { cache: "no-store" });
      const j = await r.json();
      const best = j?.data?.[0];
      if (best?.name) {
        onResult({ name: best.name });
      } else {
        setError("Aucun match visuel trouvé.");
      }
    } catch {
      setError("Erreur lors de la recherche par artwork.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Scanner une carte</h2>
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {/* Guides de cadrage */}
          <div className="pointer-events-none absolute inset-x-[6%] top-[5%] h-[18%] rounded-md border-2 border-emerald-400/70"></div>
          <div className="pointer-events-none absolute right-[6%] bottom-[3%] h-[13%] w-[40%] rounded-md border-2 border-amber-400/70"></div>
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
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
