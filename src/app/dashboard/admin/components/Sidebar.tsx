"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Home, Users, Menu, X, UserCog, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { GiCardPick, GiCardDraw } from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";

const NAV = [
  { name: "Accueil",         href: "/dashboard/admin",             Icon: Home },
  { name: "Membres",         href: "/dashboard/admin/membres",     Icon: Users },
  { name: "Team",            href: "/dashboard/admin/team",        Icon: UserCog },
  { name: "Collection",      href: "/dashboard/admin/collection",  Icon: GiCardPick },
  { name: "Decks",           href: "/dashboard/admin/decks",       Icon: GiCardDraw },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // --- Desktop collapse state (persisted)
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("sidebar:collapsed") : null;
    if (saved === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // --- Mobile drawer state
  const [isOpen, setIsOpen] = useState(false);

  // Active link helper
  const isActive = (href: string) => pathname === href;

  // Widths (px) for the motion animation on desktop
  const desktopWidth = useMemo(() => (collapsed ? 72 : 256), [collapsed]); // 72 ~= w-18, 256 = w-64

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <>
      {/* Desktop (collapsible) */}
      <motion.aside
        className="hidden lg:flex text-slate-200 bg-gray-800 p-3 flex-col justify-between sticky"
        initial={false}
        animate={{ width: desktopWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Top: Logo + nav */}
        <div>
          <div className="flex items-center justify-center py-4">
            {/* Logo: version compacte quand réduit */}
            {!collapsed ? (
              <Image
                src="/images/logo.png"
                alt="Logo Yu-Gi-Brothers"
                width={140}
                height={140}
                className="h-24 w-auto"
                priority
              />
            ) : (
              <Image
                src="/images/logo.png"
                alt="Logo Yu-Gi-Brothers"
                width={50}
                height={50}
                className="h-9 w-9"
                priority
                title="Yu-Gi-Brothers"
              />
            )}
          </div>

          <nav className="mt-4">
            <ul className="space-y-4">
              {NAV.map(({ name, href, Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 transition text-xl font-semibold",
                        active
                          ? "bg-amber-700 text-slate-100"
                          : "hover:bg-gray-700 hover:text-slate-100 text-slate-200",
                      ].join(" ")}
                      title={collapsed ? name : undefined}
                    >
                      <Icon size={20} className="shrink-0" />
                      {/* Label: masqué quand collapsed */}
                      <span
                        className={[
                          "whitespace-nowrap transition-opacity",
                          collapsed ? "opacity-0 pointer-events-none select-none" : "opacity-100",
                        ].join(" ")}
                      >
                        {name}
                      </span>

                      {collapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap">
                          {name}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Bottom: collapse toggle */}
        <div className="mt-4 border-t border-gray-700 pt-3">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-2 transition"
            aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
            title={collapsed ? "Déplier" : "Réduire"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Réduire</span>}
          </button>
          {/* Bouton logout */}
          <button 
            onClick={logout}
            className='mt-2 mb-1 bg-red-800 text-white rounded-md w-full h-10 flex justify-center items-center transition hover:bg-red-700'
          >
            {collapsed ? <LogOut size={18} /> : "Déconnexion"}
          </button>
        </div>
      </motion.aside>

      {/* Mobile toggle button */}
      <button onClick={() => setIsOpen(true)} className="lg:hidden p-3 fixed top-4 left-4 z-50">
        <Menu size={28} className="text-black/90"/>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed top-0 left-0 h-full w-64 bg-gray-800 p-6 flex flex-col justify-between z-50 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white">
              <X size={28} />
            </button>

            <div>
              <div className="flex items-center justify-center py-2">
                <Image
                  src="/images/logo.png"
                  alt="Logo Yu-Gi-Brothers"
                  width={150}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </div>

              <nav className="mt-4">
                <ul className="space-y-2">
                  {NAV.map(({ name, href, Icon }) => {
                    const active = isActive(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          className={[
                            "flex items-center gap-3 rounded-lg px-3 py-2 transition font-semibold",
                            active ? "bg-amber-700 text-white" : "text-white hover:bg-gray-700",
                          ].join(" ")}
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon size={20} />
                          {name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
            {/* Bouton logout */}
          <button 
            onClick={logout}
            className='mt-2 mb-1 bg-red-800 text-white rounded-md w-full h-10 flex justify-center items-center transition hover:bg-red-700'
          >
            {collapsed ? <LogOut size={18} /> : "Déconnexion"}
          </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}