"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Loader from '@/app/components/Loader'
import Sidebar from "./components/Sidebar";
import toast from "react-hot-toast";
import { UserData, UserRole } from "@/types/users";
import Navbar from "./components/Navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);

  // Utilise d’abord les infos de la session (déjà enrichies par NextAuth callbacks)
  const sessionUser: UserData | null = useMemo(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id!,
      email: session.user.email ?? "",
      firstName: (session.user as any).firstName ?? null,
      lastName: (session.user as any).lastName ?? null,
      pseudo: (session.user as any).pseudo ?? null,
      role: (session.user as any).role as UserRole,
    };
  }, [session?.user]);

  useEffect(() => {
    if (status === 'loading')  return;

    // Si non authentifié, le middleware redirige vers login
    if (status === 'unauthenticated') {
      setUser(null);
      return;
    }

    if (sessionUser) {
      // Pas besoin de fetch si on a tout dans la session
      setUser(sessionUser);
      return;
    }

    // Authentifié mais pas d'id => on ne tente pas de fetch
    const userId = session?.user?.id;
    if (!userId) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Utilisateur non trouvé');
        const data: UserData = await res.json();
        setUser(data);
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        console.error("Erreur de récupération utilisateur: ", error);
        toast.error('Impossible de récupérer les informations utilisateur.');
      }
    })();

    return () => controller.abort();
  }, [status, sessionUser, session?.user?.id]);

  if (status === "loading" || (status === "authenticated" && !user)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-6 rounded-lg bg-gray-800 shadow text-center">
          <p className="text-gray-300">Accès refusé.</p>
        </div>
      </div>
    )
  }

  // 2. Toute l’app admin est sous UserContext.Provider
  return (
      <div className="flex h-screen bg-gray-900 text-slate-100">
        <Sidebar />
        <div className="w-full h-full flex flex-col">
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
  );
}
