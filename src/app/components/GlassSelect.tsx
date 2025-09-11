"use client";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: React.ReactNode };

type GlassSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  id?: string;
  variant?: "glass" | "solid";      // "solid" = opaque
  usePortal?: boolean;              // <— NEW (par défaut true)
};

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  disabled,
  className = "",
  menuClassName = "",
  id,
  variant = "solid",
  usePortal = true,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [highlight, setHighlight] = useState<number>(-1);

  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const triggerBase =
    "group h-10 w-full rounded-xl border border-white/10 px-3 text-left text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-400/60 flex items-center justify-between";
  const triggerVariant =
    variant === "glass"
      ? "bg-white/10 backdrop-blur hover:bg-white/15"
      : "bg-white/10 hover:bg-slate-800";

  const menuBase =
    "max-h-60 overflow-auto rounded-xl border border-white/10 p-1 shadow-2xl shadow-black/40 focus:outline-none";
  const menuVariant =
    variant === "glass"
      ? "bg-white/10 backdrop-blur"
      : "bg-slate-900";

  // calcule et met à jour la position (sous le bouton, avec flip si pas de place)
  function placeMenu() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = r.width;
    let top = r.bottom + window.scrollY + 4;
    let left = Math.min(
      r.left + window.scrollX,
      window.scrollX + window.innerWidth - width - 8
    );
    setPos({ top, left, width });
    // flip après mesure
    requestAnimationFrame(() => {
      if (!menuRef.current) return;
      const h = menuRef.current.offsetHeight;
      const bottom = top + h;
      const viewportBottom = window.scrollY + window.innerHeight;
      if (bottom > viewportBottom - 8) {
        // affiche au-dessus
        const newTop = r.top + window.scrollY - h - 4;
        setPos({ top: Math.max(window.scrollY + 8, newTop), left, width });
      }
    });
  }

  // ouvrir/fermer + gestion focus/ESC/extérieur
  useEffect(() => {
    if (!open) return;
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    placeMenu();
    const onResize = () => placeMenu();
    const onScroll = () => placeMenu();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function commit(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange?.(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0) commit(highlight);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    }
  }

  const menuEl = (
    <ul
      role="listbox"
      id={`${id || "select"}-menu`}
      ref={menuRef}
      tabIndex={-1}
      onKeyDown={onListKeyDown}
      className={`${menuBase} ${menuVariant} z-[1000] ${menuClassName}`}
      style={
        usePortal
          ? { position: "fixed", top: pos.top, left: pos.left, width: pos.width }
          : undefined
      }
    >
      {options.map((opt, i) => {
        const active = i === highlight;
        const isSelected = opt.value === value;
        return (
          <li
            id={`${id || "select"}-opt-${i}`}
            key={String(opt.value) + i}
            role="option"
            aria-selected={isSelected}
            className={[
              "flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm",
              "text-white/90 hover:bg-white/10",
              active ? "bg-white/10" : "",
              isSelected ? "font-semibold" : "",
            ].join(" ")}
            onMouseEnter={() => setHighlight(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit(i)}
          >
            <span className="truncate">{opt.label}</span>
            {isSelected && (
              <svg className="ml-auto h-4 w-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                <path d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 4.71 9.29l3.293 3.293 7.293-7.293a1 1 0 0 1 1.408 0z" />
              </svg>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        ref={btnRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id || "select"}-menu` : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={`${triggerBase} ${triggerVariant} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      >
        <span className={selected ? "text-white" : "text-white/60"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
        </svg>
      </button>

      {/* Fallback sans portal (si tu mets usePortal={false}) */}
      {!usePortal && open && (
        <div className="absolute z-[1000] mt-1 w-full">{menuEl}</div>
      )}

      {/* Portal par défaut */}
      {usePortal && open && createPortal(menuEl, document.body)}
    </div>
  );
}
