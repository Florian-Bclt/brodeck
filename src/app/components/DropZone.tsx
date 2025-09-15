"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

type DropZoneProps = {
  onFileSelected: (file: File | null) => void;
  acceptExt?: string[]; // ex: [".ods", ".xlsx", ".xls"]
  maxSizeMB?: number;   // ex: 20
  className?: string;
};

export default function DropZone({
  onFileSelected,
  acceptExt = [".ods", ".xlsx", ".xls"],
  maxSizeMB = 20,
  className = "",
}: DropZoneProps) {
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File) => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!acceptExt.includes(ext)) {
      toast.error(`Format non supporté (${ext}). Formats acceptés: ${acceptExt.join(", ")}`);
      return false;
    }
    const max = maxSizeMB * 1024 * 1024;
    if (file.size > max) {
      toast.error(`Fichier trop lourd (> ${maxSizeMB} Mo)`);
      return false;
    }
    return true;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (!validate(f)) return;
      onFileSelected(f);
    },
    [onFileSelected]
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const openFileDialog = () => inputRef.current?.click();

  const base =
    "relative w-full rounded-2xl border-2 border-dashed px-4 py-10 text-center transition";
  const normal =
    "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30";
  const dragging =
    "border-indigo-400/80 bg-indigo-500/10 ring-2 ring-indigo-400/40";

  return (
    <div
      className={`${base} ${isDragging ? dragging : normal} ${className}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFileDialog()}
      onClick={openFileDialog}
      aria-label="Déposer un fichier ou cliquer pour sélectionner"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptExt.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Glow décoratif */}
      <div className="pointer-events-none absolute -inset-10 -z-10 opacity-40 blur-3xl [background:radial-gradient(60rem_30rem_at_50%_-20%,#6366f1_0%,transparent_60%)]" />

      <div className="mx-auto max-w-xl text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
          <svg width="24" height="24" fill="none" className="opacity-90">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <p className="text-base font-semibold">Glisse ton fichier ici</p>
        <p className="mt-1 text-sm opacity-80">…ou clique pour le sélectionner</p>
        <p className="mt-2 text-xs opacity-60">
          Formats acceptés: {acceptExt.join(", ")} • Taille max: {maxSizeMB} Mo
        </p>
      </div>
    </div>
  );
}