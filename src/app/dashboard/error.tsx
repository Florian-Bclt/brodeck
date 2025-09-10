// app/error.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    // Log automatique
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center p-8">
      <h1 className="text-3xl font-bold mb-3 text-red-600">Oups... Une erreur est survenue</h1>
      <p className="mb-4 text-gray-700 dark:text-gray-200">Impossible d’accéder à la ressource ou au service distant.<br />
        <span className="text-xs text-gray-400">
          {error.message || "Erreur inattendue."}
        </span>
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Réessayer
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Retour à l’accueil
        </button>
      </div>
    </div>
  );
}
