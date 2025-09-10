"use client";

import { useState } from "react";
import { useConsent } from "@/context/ConsentProvider";

export default function CookieBanner() {
  const { ready, consent, acceptAll, rejectAll, save } = useConsent();
  const [openPrefs, setOpenPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);

  if (!ready || consent.given) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-3xl m-3 rounded-2xl border border-black-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 shadow-xl">
        <div className="text-sm">
          <p className="font-semibold">Cookies & confidentialité</p>
          <p className="opacity-80 mt-1">
            On utilise des cookies essentiels pour faire fonctionner le site. Avec ton accord, on utilisera aussi des
            cookies d’analyse pour améliorer la plateforme.
          </p>

          {openPrefs && (
            <div className="mt-3 grid gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled />
                <span>Essentiels (toujours actifs)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
                <span>Analyse (mesure d’audience)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                <span>Marketing</span>
              </label>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!openPrefs && (
              <>
                <button onClick={acceptAll} className="px-4 py-2 rounded-xl bg-primary-main text-white hover:bg-black-5 hover:text-primary-main">
                  Tout accepter
                </button>
                <button onClick={rejectAll} className="px-4 py-2 rounded-xl border border-black-40 hover:bg-black-5 hover:text-variant-dark">
                  Tout refuser
                </button>
                <button onClick={() => setOpenPrefs(true)} className="px-4 py-2 rounded-xl hover:bg-black-5 hover:text-variant-dark">
                  Personnaliser
                </button>
                <a href="/cgu" className="ml-auto underline opacity-80">En savoir plus</a>
              </>
            )}

            {openPrefs && (
              <>
                <button
                  onClick={() => save({ analytics, marketing })}
                  className="px-4 py-2 rounded-xl bg-primary-main text-white hover:opacity-90"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setAnalytics(false); setMarketing(false); save({ analytics: false, marketing: false });
                  }}
                  className="px-4 py-2 rounded-xl border border-black-40 hover:bg-black-5"
                >
                  Tout refuser
                </button>
                <button
                  onClick={() => {
                    setAnalytics(true); setMarketing(true); save({ analytics: true, marketing: true });
                  }}
                  className="px-4 py-2 rounded-xl hover:bg-black-5"
                >
                  Tout accepter
                </button>
                <button onClick={() => setOpenPrefs(false)} className="ml-auto px-3 py-2 underline opacity-80">
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
