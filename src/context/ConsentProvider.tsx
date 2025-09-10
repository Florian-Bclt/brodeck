"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  given: boolean;     // l'utilisateur a pris une décision
  date?: string;
};

type ConsentCtx = {
  ready: boolean;                 // localStorage chargé
  consent: Consent;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (partial: Partial<Pick<Consent, "analytics" | "marketing">>) => void; // pour "Personnaliser"
};

const ConsentContext = createContext<ConsentCtx | null>(null);
const STORAGE_KEY = "ci.consent";

const defaultConsent: Consent = {
  essential: true,
  analytics: false,
  marketing: false,
  given: false,
};

function persist(consent: Consent) {
  // localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  // cookie (utile pour lire côté serveur un jour)
  document.cookie = `ci_consent=${encodeURIComponent(
    JSON.stringify({ a: consent.analytics, m: consent.marketing })
  )}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<Consent>(defaultConsent);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Consent>;
        const next: Consent = { ...defaultConsent, ...parsed, essential: true as const };
        setConsent(next);
      }
    } catch {/* ignore */}
    setReady(true);
  }, []);

  const acceptAll = () => {
    const next: Consent = {
      essential: true as const,
      analytics: true,
      marketing: true,
      given: true,
      date: new Date().toISOString() 
    }
    setConsent(next);
    persist(next);
  };

  const rejectAll = () => {
    const next: Consent = { 
      essential: true as const, 
      analytics: false, 
      marketing: false, 
      given: true, 
      date: new Date().toISOString() 
    };
    setConsent(next);
    persist(next);
  };

  const save = (partial: Partial<Pick<Consent, "analytics" | "marketing">>) => {
    const next: Consent = {
      ...consent,
      ...partial,
      essential: true as const,
      given: true,
      date: new Date().toISOString()
    };
    setConsent(next);
    persist(next);
  };

  const value = useMemo<ConsentCtx>(() => ({ ready, consent, acceptAll, rejectAll, save }), [ready, consent]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within CookieConsentProvider");
  return ctx;
}
