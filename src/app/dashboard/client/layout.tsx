"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Loader from '@/app/components/Loader'
import Sidebar from "./components/Sidebar";
import Navbar from "../admin/components/Navbar";
import toast from "react-hot-toast";
import { UserData, UserRole } from "@/types/users";
import { useRouter } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null)

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
    if (status === "unauthenticated") {
      setUser(null);
      return;
    }

    if (sessionUser) {
      setUser(sessionUser);
      return;
    }
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

  if (!session?.user?.role) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-6 rounded-lg bg-gray-800 shadow text-center">
          <p className="text-gray-300">Accès refusé.</p>
        </div>
      </div>
    )
  }

  if (user?.role !== "CLIENT") {
    // Option: rediriger automatiquement vers l’admin si c’est un admin
    if (user?.role === "ADMIN") {
      router.push("/dashboard/admin");
      return null;
    }
    return (
      <div className="grid min-h-dvh place-items-center bg-gray-950 text-gray-200">
        <p className="rounded-lg bg-gray-800 p-6">Accès réservé aux membres.</p>
      </div>
    );
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
