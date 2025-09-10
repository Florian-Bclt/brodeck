"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Search, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import BtnSpinner from "@/app/components/BtnSpinner";

type UserRole = "CLIENT" | "ADMIN";
type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pseudo?: string | null;
  role: UserRole;
  createdAt?: string;
};
type ListResp = {
  total: number;
  page: number;
  pageSize: number;
  data: Member[];
};

const PAGE_SIZE = 12;

export default function MembresPage() {
  // listing
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<ListResp | null>(null);

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cEmail, setCEmail] = useState("");
  const [cFirstName, setCFirstName] = useState("");
  const [cLastName, setCLastName] = useState("");
  const [cPseudo, setCPseudo] = useState("");
  const [cPassword, setCPassword] = useState("");

  // edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [eEmail, setEEmail] = useState("");
  const [eFirstName, setEFirstName] = useState("");
  const [eLastName, setELastName] = useState("");
  const [ePseudo, setEPseudo] = useState<string>(""); // vide = none, "—" visuel en table
  const [ePassword, setEPassword] = useState("");      // laisser vide = ne pas changer

  // delete modal
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const totalPages = useMemo(
    () => (resp ? Math.max(1, Math.ceil(resp.total / resp.pageSize)) : 1),
    [resp]
  );

  async function load(p = page) {
    setLoading(true);
    try {
      const url = new URL(`/api/users`, window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      url.searchParams.set("role", "CLIENT");
      url.searchParams.set("page", String(p));
      url.searchParams.set("pageSize", String(PAGE_SIZE));

      const r = await fetch(url.toString());
      if (!r.ok) throw new Error("Fetch failed");
      const data: ListResp = await r.json();
      setResp(data);
      setPage(p);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les membres.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetCreateModal() {
    setCEmail(""); setCFirstName(""); setCLastName(""); setCPseudo(""); setCPassword("");
  }

  async function createMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cEmail || !cFirstName || !cLastName || !cPassword) {
      toast.error("Tous les champs requis ne sont pas remplis.");
      return;
    }
    if (cPassword.length < 6) {
      toast.error("Mot de passe trop court (min. 6 caractères).");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cEmail,
          password: cPassword,
          firstName: cFirstName,
          lastName: cLastName,
          pseudo: cPseudo || undefined,
          role: "CLIENT",
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Création impossible");
      }
      toast.success("Membre ajouté !");
      setOpenCreate(false);
      resetCreateModal();
      await load(1);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  // EDIT
  function openEditFor(m: Member) {
    setEditTarget(m);
    setEEmail(m.email || "");
    setEFirstName(m.firstName || "");
    setELastName(m.lastName || "");
    setEPseudo(m.pseudo || "");
    setEPassword("");
    setOpenEdit(true);
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;

    if (!eEmail || !eFirstName || !eLastName) {
      toast.error("Email, prénom et nom sont requis.");
      return;
    }
    if (ePassword && ePassword.length < 6) {
      toast.error("Mot de passe trop court (min. 6 caractères).");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        email: eEmail,
        firstName: eFirstName,
        lastName: eLastName,
        pseudo: ePseudo === "" ? null : ePseudo, // vide => null
      };
      if (ePassword) payload.password = ePassword;

      const r = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Mise à jour impossible");
      }
      toast.success("Membre mis à jour.");
      setOpenEdit(false);
      await load(page);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  // DELETE
  function openDeleteFor(m: Member) {
    setDeleteTarget(m);
    setOpenDelete(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Suppression impossible");
      }
      toast.success("Membre supprimé.");
      setOpenDelete(false);
      // si la page devient vide, remonte d’une page
      const nextCount = (resp?.total || 1) - 1;
      const lastPageAfterDelete = Math.max(1, Math.ceil(nextCount / (resp?.pageSize || PAGE_SIZE)));
      const targetPage = Math.min(page, lastPageAfterDelete);
      await load(targetPage);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  const displayName = (m: Member) =>
    (m.pseudo && m.pseudo.trim()) ||
    [m.firstName, m.lastName].filter(Boolean).join(" ").trim() ||
    m.email;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Membres</h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={18} />
            <input
              placeholder="Rechercher (nom, email, pseudo)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(1)}
              className="h-10 w-64 rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 outline-none ring-1 ring-white/10 transition focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60"
            />
          </div>
          <button
            onClick={() => load(1)}
            className="h-10 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium transition hover:bg-white/20"
          >
            Rechercher
          </button>

          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 font-semibold ring-1 ring-white/10 transition hover:brightness-110"
          >
            <Plus size={18} />
            Ajouter un membre
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
              <tr className="text-left text-white/70">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Pseudo</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                [...Array(6)].map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-white/5">
                    <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-white/10" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-56 animate-pulse rounded bg-white/10" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-white/10" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-white/10" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-white/10" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-28 animate-pulse rounded bg-white/10" /></td>
                  </tr>
                ))
              )}

              {!loading && resp?.data?.length === 0 && (
                <tr className="border-t border-white/5">
                  <td colSpan={6} className="px-4 py-6 text-center text-white/60">
                    Aucun membre trouvé.
                  </td>
                </tr>
              )}

              {!loading && resp?.data?.map((m) => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-medium">{displayName(m)}</td>
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{m.pseudo || <span className="opacity-50">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditFor(m)}
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs transition hover:bg-white/20"
                        aria-label={`Éditer ${displayName(m)}`}
                      >
                        <span className="inline-flex items-center gap-1"><Pencil size={14}/> Éditer</span>
                      </button>
                      <button
                        onClick={() => openDeleteFor(m)}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/15 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/25"
                        aria-label={`Supprimer ${displayName(m)}`}
                      >
                        <span className="inline-flex items-center gap-1"><Trash2 size={14}/> Supprimer</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
          <div className="opacity-70">
            {resp ? <>Total : <b>{resp.total}</b></> : <>Chargement…</>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => page > 1 && load(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button
              onClick={() => page < totalPages && load(page + 1)}
              disabled={page >= totalPages || loading}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Ajouter */}
      {openCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ajouter un membre</h3>
              <button className="rounded-md p-2 hover:bg-white/10" onClick={() => setOpenCreate(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createMember} className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs opacity-70">Prénom</label>
                  <input value={cFirstName} onChange={(e) => setCFirstName(e.target.value)} required
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs opacity-70">Nom</label>
                  <input value={cLastName} onChange={(e) => setCLastName(e.target.value)} required
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Email</label>
                <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Pseudo (optionnel)</label>
                <input value={cPseudo} onChange={(e) => setCPseudo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Mot de passe</label>
                <input type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required minLength={6}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10" onClick={() => setOpenCreate(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="relative inline-flex justify-center items-center min-w-28 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 font-semibold ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-60">
                  {creating ? <BtnSpinner /> : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Éditer */}
      {openEdit && editTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Modifier le membre</h3>
              <button className="rounded-md p-2 hover:bg-white/10" onClick={() => setOpenEdit(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs opacity-70">Prénom</label>
                  <input value={eFirstName} onChange={(e) => setEFirstName(e.target.value)} required
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs opacity-70">Nom</label>
                  <input value={eLastName} onChange={(e) => setELastName(e.target.value)} required
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Email</label>
                <input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} required
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Pseudo (laisser vide pour effacer)</label>
                <input value={ePseudo} onChange={(e) => setEPseudo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Nouveau mot de passe (optionnel)</label>
                <input type="password" value={ePassword} onChange={(e) => setEPassword(e.target.value)} minLength={6}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10" onClick={() => setOpenEdit(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="relative inline-flex min-w-28 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 font-semibold ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-60">
                  {saving ? <BtnSpinner /> : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Supprimer */}
      {openDelete && deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Supprimer le membre</h3>
              <p className="mt-2 text-sm text-white/70">
                Confirmer la suppression de <b>{displayName(deleteTarget)}</b> ? Cette action est irréversible.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
                onClick={() => setOpenDelete(false)}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="relative min-w-28 inline-flex items-center gap-2 rounded-xl bg-rose-600/90 px-4 py-2 font-semibold ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-60"
              >
                {deleting ? <BtnSpinner /> : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
