"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import BtnSpinner from "@/app/components/BtnSpinner";
import type { UserRole } from "@/types/users";

export default function LoginClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", { redirect: false, email, password });
      if (!res) { toast.error("Une erreur est survenue"); return; }
      if (res.error) { toast.error(res.error || "Échec de connexion"); return; }

      const session = await getSession();
      const role = session?.user?.role as UserRole | undefined;
      router.push(role === "ADMIN" ? "/dashboard/admin" : "/dashboard/client");
    } catch {
      toast.error("Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundImage: "url('/images/bg_login.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Overlay dégradé pour lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      {/* Glow subtil */}
      <div className="pointer-events-none absolute -inset-40 opacity-40 blur-3xl [background:radial-gradient(60rem_30rem_at_50%_-10%,#6D28D9_0%,transparent_60%),radial-gradient(40rem_20rem_at_60%_90%,#2563EB_0%,transparent_55%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_20px_120px_rgba(0,0,0,.45)] backdrop-blur-xl md:p-8">
          <h1 className="mb-4 text-center text-4xl font-extrabold text-white">
            Connexion
          </h1>

          <form onSubmit={onSubmit} className="grid gap-5">
            {/* Email */}
            <div className="relative">
              <label htmlFor="email" className="sr-only">Email</label>
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-3 text-white placeholder-white/60 outline-none ring-1 ring-white/10 transition focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-10 text-white placeholder-white/60 outline-none ring-1 ring-white/10 transition focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 font-semibold text-white shadow-lg ring-1 ring-white/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <BtnSpinner /> : "Se connecter"}
              <span className="absolute inset-0 -z-10 rounded-2xl opacity-0 blur-2xl transition group-hover:opacity-40 [background:radial-gradient(40%_60%_at_50%_0%,#ffffff55,transparent_60%)]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
