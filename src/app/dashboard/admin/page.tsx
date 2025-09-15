"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export default function AdminDashboard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data: session, status } = useSession();
  const [ownedCount, setOwnedCount] = useState<number | null>(null);

  // Respecte "prefers-reduced-motion" (désactive l’auto-play si l’utilisateur le souhaite)
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  useEffect(() => {
    async function fetchOwned() {
      try {
        const res = await fetch("/api/stats/cards-owned", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setOwnedCount(data.totalOwned);
      } catch (e) {
        console.error("Erreur fetch cartes possédées", e);
        setOwnedCount(0);
      }
    }
    fetchOwned();
  }, []);

  const pseudo = (session?.user as any)?.pseudo ?? null;
  const firstName = (session?.user as any)?.firstName ?? null;
  const displayName =
    pseudo || firstName || session?.user?.email?.split("@")[0] || "Utilisateur";


  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Vidéo de fond */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
        src="/images/bg-animate.mp4"   // public/images/bg-animate.mp4
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      {/* Overlay pour la lisibilité du contenu */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Contenu */}
      <div className="relative z-10 p-4 md:p-6">
        <h1 className="flex justify-center lg:justify-start text-3xl font-bold text-white">Salut, {displayName}</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/40 bg-white/40 p-4 text-slate-600 backdrop-blur">
            <p className="text-sm opacity-80">Cartes possédés</p>
            <p className="mt-2 text-2xl font-semibold">{ownedCount === null ? "..." : ownedCount}</p>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/40 p-4 text-slate-600 backdrop-blur">
            <p className="text-sm opacity-80">Cartes sync</p>
            <p className="mt-2 text-2xl font-semibold">13 876</p>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/40 p-4 text-slate-600 backdrop-blur">
            <p className="text-sm opacity-80">Dernière sync</p>
            <p className="mt-2 text-2xl font-semibold">Aujourd’hui</p>
          </div>
        </div>
      </div>
    </main>
  );
}
