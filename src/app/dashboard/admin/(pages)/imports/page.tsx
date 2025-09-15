"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import DropZone from "@/app/components/DropZone";

type Suggestion = { cardId: number; name: string; type: string | null; race: string | null; score: number };
type PreviewRow = {
  rowIndex: number;
  frName?: string | null;
  enName?: string | null;
  cardType?: string | null;
  monsterRace?: string | null;
  qty: number;
  status: "exact" | "fuzzy" | "ambiguous" | "not_found";
  confidence: number;
  suggestions: Suggestion[];
  chosenCardId?: number;
};

export default function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    if (!file) return toast.error("Sélectionne un fichier .ods/.xlsx");
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    try {
      const res = await fetch("/api/import/ownership?dryRun=1", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Import preview failed");
      const json = await res.json();
      setRows(json.rows || []);
      if (!json.rows?.length) toast("Aucune ligne détectée dans le fichier.", { icon: "ℹ️" });
    } catch (e: any) {
      toast.error(e?.message || "Erreur import");
    } finally {
      setLoading(false);
    }
  }

  function resetFile() {
    setFile(null);
    setRows(null);
  }

  function updateChosen(rowIdx: number, cardId: number) {
    if (!rows) return;
    setRows(rows.map((r, i) => (i === rowIdx ? { ...r, chosenCardId: cardId, status: "fuzzy" } : r)));
  }

  async function handleApply() {
    if (!rows) return;
    const payload = {
      rows: rows
        .filter(r => r.qty > 0 && r.chosenCardId)
        .map(r => ({ chosenCardId: r.chosenCardId!, qty: r.qty })),
    };
    if (payload.rows.length === 0) return toast.error("Aucune ligne applicable");

    setLoading(true);
    try {
      const res = await fetch("/api/import/ownership?dryRun=0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Apply failed");
      toast.success(`Import terminé (${json.updated} lignes)`);
    } catch (e: any) {
      toast.error(e?.message || "Erreur application import");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Import de collection</h2>
            <p className="text-sm opacity-80">
              Dépose un fichier <b>.ods</b>, <b>.xlsx</b> ou <b>.xls</b> — colonnes: A=Nom FR, B=Nom EN, C=Type, D=Type de monstre, E=Quantité
            </p>
          </div>
          {file ? (
            <button
              onClick={resetFile}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
            >
              Retirer le fichier
            </button>
          ) : null}
        </div>

        {!file ? (
          <div className="mt-4">
            <DropZone
              onFileSelected={setFile}
              acceptExt={[".ods", ".xlsx", ".xls"]}
              maxSizeMB={25}
            />
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm">
                <span className="opacity-70">Fichier sélectionné: </span>
                <b title={file.name}>{file.name}</b>
              </div>
              <div className="text-xs opacity-70">{(file.size / (1024 * 1024)).toFixed(2)} Mo</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 font-semibold text-white ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Analyse…" : "Prévisualiser"}
              </button>
              <button
                onClick={resetFile}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
              >
                Changer
              </button>
            </div>
          </div>
        )}
      </div>

      {rows && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-white text-base font-semibold">Prévisualisation ({rows.length} lignes)</h3>
            <button
              onClick={handleApply}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 font-semibold text-white ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-50"
            >
              Appliquer l’import
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm text-white/90">
              <thead className="text-white/70">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-left">Nom EN</th>
                  <th className="px-2 py-1 text-left">Type / Race</th>
                  <th className="px-2 py-1 text-left">Quantité</th>
                  <th className="px-2 py-1 text-left">Proposition</th>
                  <th className="px-2 py-1 text-left">Confiance</th>
                  <th className="px-2 py-1 text-left">Choix</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-2 py-1">{r.rowIndex}</td>
                    <td className="px-2 py-1">{r.enName || <span className="opacity-60">—</span>}</td>
                    <td className="px-2 py-1">
                      {(r.cardType || "—") + " / " + (r.monsterRace || "—")}
                    </td>
                    <td className="px-2 py-1">{r.qty}</td>
                    <td className="px-2 py-1">
                      {r.suggestions.length === 0 ? (
                        <span className="opacity-60">Aucune</span>
                      ) : (
                        <div className="space-y-1">
                          {r.suggestions.slice(0, 3).map(s => (
                            <div key={s.cardId} className="truncate">
                              {s.name}
                              <span className="opacity-60"> ({s.type || "?"} / {s.race || "—"})</span>
                              <span className="ml-1 opacity-60">[{s.score.toFixed(2)}]</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <span className={
                        r.status === "exact" ? "text-emerald-400" :
                        r.status === "fuzzy" ? "text-amber-300" :
                        r.status === "ambiguous" ? "text-orange-400" :
                        "text-red-400"
                      }>
                        {r.status} {r.confidence ? `(${(r.confidence*100)|0}%)` : ""}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        className="rounded bg-white/10 px-2 py-1"
                        value={r.chosenCardId ?? ""}
                        onChange={(e) => updateChosen(i, Number(e.target.value))}
                      >
                        <option value="">—</option>
                        {r.suggestions.map(s => (
                          <option key={s.cardId} value={s.cardId}>
                            {s.name} ({s.type || "?"}/{s.race || "—"})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-white/60">
            Astuce: corrige manuellement les lignes ambiguës via le sélecteur “Choix”, puis clique “Appliquer l’import”.
          </p>
        </div>
      )}
    </div>
  );
}
