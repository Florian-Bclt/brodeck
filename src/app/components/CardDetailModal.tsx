"use client";

import { CardDetail } from "@/types/cards";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast"; 

type Props = {
  cardId: number | null;
  open: boolean;
  onClose: () => void;
};

export default function CardDetailModal({ cardId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardDetail | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Chargement des détails
  useEffect(() => {
    if (!open || !cardId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setCard(null);
        // Adapte l’endpoint si besoin
        const res = await fetch(`/api/cards/${cardId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Fetch failed");
        const data: CardDetail = await res.json();
        if (!cancelled) setCard(data);
      } catch (e) {
        if (!cancelled) toast.error("Impossible de charger la carte.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, cardId]);

  // Fermer via ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <div
      ref={dialogRef}
      onMouseDown={closeOnBackdrop}
      className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="mx-3 grid w-full max-w-5xl grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-gray-900/95 p-4 text-white shadow-2xl md:grid-cols-[minmax(280px,360px),1fr]">
        {/* Colonne image */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {loading && (
              <div className="h-[480px] w-[340px] rounded-xl bg-white/10 animate-pulse" />
            )}
            {!loading && card && (
              // image large si dispo, sinon small
              <img
                src={card.imageLargeUrl || card.imageSmallUrl || "/images/placeholder-card.png"}
                alt={card.name}
                className="h-[480px] w-[340px] rounded-xl object-cover ring-1 ring-white/15"
              />
            )}
            {/* Bouton fermer mobile */}
            <button
              onClick={onClose}
              className="absolute -right-2 -top-2 rounded-full bg-black/70 px-2 py-1 text-sm ring-1 ring-white/20 hover:bg-black/80 md:hidden"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Colonne infos */}
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="truncate text-2xl font-bold">
              {loading ? "Chargement…" : card?.name}
            </h2>
            <button
              onClick={onClose}
              className="hidden rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20 md:block"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
            <Info label="Type" value={card?.type} />
            <Info label="Attribut" value={card?.attribute} />
            <Info label="Classe/Race" value={card?.race} />
            <Info label="Niveau" value={card?.level != null ? `${card.level}` : undefined} />
            <Info label="ATK" value={card?.atk != null ? `${card.atk}` : undefined} />
            <Info label="DEF" value={card?.def != null ? `${card.def}` : undefined} />
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold opacity-80">Effet</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/90">
              {loading ? "…" : (card?.desc || "—")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="truncate text-sm">{value ?? "—"}</div>
    </div>
  );
}
