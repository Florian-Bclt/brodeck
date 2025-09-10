"use client";

import { useEffect, useRef } from "react";

export default function AdminDashboard() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Respecte "prefers-reduced-motion" (désactive l’auto-play si l’utilisateur le souhaite)
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

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
        <h1 className="text-3xl font-bold text-white">Dashboard admin</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
            <p className="text-sm opacity-80">Membres</p>
            <p className="mt-2 text-2xl font-semibold">42</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
            <p className="text-sm opacity-80">Cartes sync</p>
            <p className="mt-2 text-2xl font-semibold">13 876</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
            <p className="text-sm opacity-80">Dernière sync</p>
            <p className="mt-2 text-2xl font-semibold">Aujourd’hui</p>
          </div>
        </div>
      </div>
    </main>
  );
}
