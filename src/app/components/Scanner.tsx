"use client"

import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

export function ScannerModal({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (res: { passcode?: string; name?: string }) => void;}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ouvre/ferme la caméra selon l'état du modal
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
      } catch (error) {
        setError("Accès caméra refusé (HTTPS/permissions/appareil).");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }, [open]);

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

    // Helper de crop (pourcentage)
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

    // Zones ROI : haut (nom), bas-droit (passcode)
    const nameROI = crop(0.06, 0.05, 0.88, 0.18);
    const codeROI = crop(0.55, 0.84, 0.40, 0.13);

    // Tesseract v5/v6 : langue en 1er, options (incl. logger) en 3e param
    const worker = await createWorker("eng", undefined, { logger: () => {} });
    try {
      // 1) Passcode (chiffres uniquement), PSM single line
      await (worker as any).setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: "7",
      });
      const codeRes = await worker.recognize(codeROI);
      const digits = (codeRes.data.text || "").replace(/\D+/g, "");
      const passcode = digits.match(/\d{8,10}/)?.[0];

      // 2) Nom (autoriser espaces), PSM single line
      await (worker as any).setParameters({
        tessedit_char_whitelist: "",
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "7",
      });
      const nameRes = await worker.recognize(nameROI);
      const name = (nameRes.data.text || "")
        .split("\n").map((s: string) => s.trim()).filter(Boolean)[0] || undefined;

      onResult({ passcode, name });
    } catch {
      setError("Échec OCR. Essaie d'améliorer l’éclairage/cadrage.");
    } finally {
      await worker.terminate();
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