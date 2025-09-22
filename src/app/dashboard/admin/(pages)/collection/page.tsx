"use client";

import { GlassSelect } from "@/app/components/GlassSelect";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MONSTER_CLASSES, MONSTER_RACES, ATTRIBUTES, SPELL_SUBTYPES, TRAP_SUBTYPES, CardType, StockFilter, BanFilter } from "@/features/cards/constants";
import { tMonsterClass, tMonsterRace, tAttribute, tSpellSubtype, tTrapSubtype, toOptions } from "@/features/cards/labelFR";
import { buildCardSearchParams } from "@/features/cards/params";
import CardDetailModal from "@/app/components/CardDetailModal";
import { CardRow, Filters, ListResp } from "@/types/cards";
import { ScannerModal } from "@/app/components/Scanner";

const PAGE_SIZE = 60;

export default function CollectionPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);

  // qty par carte (id -> qty)
  const [stock, setStock] = useState<Record<number, number>>({});
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  // --- Filtres ---
  const [cardType, setCardType] = useState<"ALL"|"MONSTER"|"SPELL"|"TRAP">("ALL");
  const [monsterClass, setMonsterClass] = useState("");
  const [monsterRace, setMonsterRace] = useState("");
  const [attribute, setAttribute] = useState("");

  const [spellSubtype, setSpellSubtype] = useState("");
  const [trapSubtype,  setTrapSubtype]  = useState("");

  const [levelMin, setLevelMin] = useState<string>("");
  const [levelMax, setLevelMax] = useState<string>("");
  const [atkMin, setAtkMin] = useState<string>("");
  const [atkMax, setAtkMax] = useState<string>("");
  const [defMin, setDefMin] = useState<string>("");
  const [defMax, setDefMax] = useState<string>("");

  const [stockFilter, setStockFilter] = useState<"all"|"owned"|"unowned">("all");
  const [banFilter, setBanFilter] = useState<BanFilter>("any");

  // scanner
  const [scannerOpen, setScannerOpen] = useState(false);

  // Détail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
  };
  const closeDetail = () => {
    setDetailOpen(false);
  };
  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data]
  );

  function currentFilters(): Filters {
    return {
      cardType,
      monsterClass, monsterRace, attribute,
      spellSubtype, trapSubtype,
      levelMin, levelMax, atkMin, atkMax, defMin, defMax,
      stock: stockFilter,
      ban: banFilter,
    };
  };

  function buildParams(targetPage = page, query = q) {
    return buildCardSearchParams({
      q: query,
      page: targetPage,
      pageSize: PAGE_SIZE,

      cardType,

      monsterClass,
      race: monsterRace,
      attribute,

      spellSubtype,
      trapSubtype,

      levelMin, levelMax, atkMin, atkMax, defMin, defMax,

      stock: stockFilter,
      ban: banFilter as BanFilter,
    });
  }

  async function load(targetPage = page, query = q, overrides: Partial<Filters> = {}) {
    setLoading(true);
    try {
      const filters = { ...currentFilters(), ...overrides };
      const sp = buildCardSearchParams({
        ...filters,
        q: query,
        page: targetPage,
        pageSize: PAGE_SIZE
      });

      const res = await fetch(`/api/cards?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");
      const json: ListResp = await res.json();
      setData(json);
      setPage(targetPage);

      // Charger uniquement les qty des cartes visibles
      const ids = json.data.map((c) => c.id).join(",");
      if (ids) {
        const r = await fetch(`/api/ownership?cardIds=${ids}`, { cache: "no-store" });
        if (r.ok) {
          const rows: { cardId: number; qty: number }[] = await r.json();
          const map: Record<number, number> = {};
          for (const it of rows) map[it.cardId] = it.qty;
          setStock(map);
        } else setStock({});
      } else setStock({});
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les cartes.");
    } finally {
      setLoading(false);
    }
  }

  function applySearch() {
    const query = qInput.trim();
    setQ(query);
    load(1, query);
  }

  function clearFilters() {
    setCardType("ALL");
    setMonsterClass(""); setMonsterRace(""); setAttribute("");
    setSpellSubtype(""); setTrapSubtype("");
    setLevelMin(""); setLevelMax(""); setAtkMin(""); setAtkMax(""); setDefMin(""); setDefMax("");
    setStockFilter("all"); setBanFilter("any");
    load(1, q);
  }

  async function setQty(cardId: number, nextQty: number) {
    nextQty = Math.max(0, nextQty);
    setUpdating((s) => ({ ...s, [cardId]: true }));
    const prev = stock[cardId] ?? 0;
    setStock((s) => ({ ...s, [cardId]: nextQty }));
    try {
      const r = await fetch("/api/ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, qty: nextQty }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Échec de la mise à jour");
      }
    } catch (e: any) {
      setStock((s) => ({ ...s, [cardId]: prev }));
      toast.error(e?.message || "Erreur lors de la mise à jour");
    } finally {
      setUpdating((s) => ({ ...s, [cardId]: false }));
    }
  }

  // reset des filtres dépendants
  useEffect(() => {
    if (cardType !== "MONSTER") {
      setMonsterClass(""); setMonsterRace(""); setAttribute("");
      setLevelMin(""); setLevelMax(""); setAtkMin(""); setAtkMax(""); setDefMin(""); setDefMax("");
    }
    if (cardType !== "SPELL") setSpellSubtype("");
    if (cardType !== "TRAP")  setTrapSubtype("");
    // auto-reload quand on change le type global
    load(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType]);

  // Quand le scanner renvoie un résultat, on le convertit en recherche UI
  const handleScanResult = async ({ passcode, name }: { passcode?: string; name?: string }) => {
    let query = "";

    // 1) Si passcode → essaie de récupérer le nom via l’endpoint /by-id
    if (passcode) {
      try {
        const byId = await fetch(`/api/cards/by-id?id=${passcode}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);
        const hit: CardRow | undefined = byId?.data?.[0];
        if (hit?.name) query = hit.name;
      } catch { /* ignore */ }
    }

    // 2) Sinon, fallback sur le nom OCR
    if (!query && name) query = name;

    // 3) Applique la recherche comme si l’utilisateur avait tapé
    if (query) {
      setQInput(query);
      setQ(query);
      load(1, query);
    } else {
      toast.error("Aucun texte détecté. Réessaie en cadrant mieux la carte.");
    }

    setScannerOpen(false);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden p-4 md:p-6">
      {/* glow / décor */}
      <div className="pointer-events-none absolute -inset-40 -z-10 opacity-40 blur-3xl [background:radial-gradient(70rem_40rem_at_60%_-10%,#6D28D9_0%,transparent_60%),radial-gradient(50rem_30rem_at_40%_100%,#2563EB_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Header + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <h1 className="flex justify-center lg:justify-start text-2xl font-bold text-white">Ma collection</h1>
          <button
            onClick={() => setScannerOpen(true)}
            className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
            title="Scanner une carte et lancer une recherche"
          >
            Scanner une carte
          </button>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Rechercher une carte (ex: Dark Magician)"
            className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-white outline-none ring-1 ring-white/10 transition focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60"
          />
          <button
            onClick={applySearch}
            className="h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 font-semibold text-white ring-1 ring-white/10 transition hover:brightness-110"
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Filtres avancés (neon/glass) */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs opacity-70">Type de carte</label>
            <GlassSelect
              value={cardType}
              onChange={(v) => { const next = v as CardType; setCardType(next); 
                const reset = {
                  monsterClass: "", monsterRace: "", attribute: "",
                  spellSubtype: "", trapSubtype: "",
                  levelMin: "", levelMax: "", atkMin: "", atkMax: "", defMin: "", defMax: "",
                };

                if (next !== "MONSTER") setMonsterClass(""), setMonsterRace(""), setAttribute(""),
                  setLevelMin(""), setLevelMax(""), setAtkMin(""), setAtkMax(""), setDefMin(""), setDefMax("");
                if (next !== "SPELL") setSpellSubtype("");
                if (next !== "TRAP")  setTrapSubtype("");

                load(1, q, { cardType: next, ...reset });
              }}
              options={[
                { value: "ALL", label: "Tous" },
                { value: "MONSTER", label: "Monstre" },
                { value: "SPELL", label: "Magie" },
                { value: "TRAP", label: "Piège" },
              ]}
              placeholder="Type de carte"
            />
          </div>

          {cardType === "MONSTER" && (
            <>
              <div>
                <label className="mb-1 block text-xs opacity-70">Classe (Normal, Effet…)</label>
                <GlassSelect
                  value={monsterClass}
                  onChange={(v) => { setMonsterClass(v); load(1, q, {monsterClass: v}); }}
                  options={[ { value: "", label: "Toutes" }, ...toOptions(MONSTER_CLASSES, tMonsterClass) ]}
                  variant="solid"
                  usePortal
                  placeholder="Classe"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Type de monstre</label>
                <GlassSelect
                  value={monsterRace}
                  onChange={(v) => { setMonsterRace(v); load(1, q, { monsterRace: v}); }}
                  options={[ { value: "", label: "Tous" }, ...toOptions(MONSTER_RACES, tMonsterRace) ]}
                  variant="solid"
                  usePortal
                  placeholder="Race"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-70">Attribut</label>
                <GlassSelect
                  value={attribute}
                  onChange={(v) => { setAttribute(v); load(1, q, { attribute: v}); }}
                  options={[ { value: "", label: "Tous" }, ...toOptions(ATTRIBUTES, tAttribute) ]}
                  variant="solid"
                  usePortal
                  placeholder="Attribut"
                />
              </div>
            </>
          )}

          {cardType === "SPELL" && (
            <div>
              <label className="mb-1 block text-xs opacity-70">Type de Magie</label>
              <GlassSelect
                value={spellSubtype}
                onChange={(v) => { setSpellSubtype(v); load(1, q, { spellSubtype: v}); }}
                options={[ { value: "", label: "Tous" }, ...toOptions(SPELL_SUBTYPES, tSpellSubtype) ]}
                variant="solid"
                usePortal
                placeholder="Sous-type"
              />
            </div>
          )}

          {cardType === "TRAP" && (
            <div>
              <label className="mb-1 block text-xs opacity-70">Type de Piège</label>
              <GlassSelect
                value={trapSubtype}
                onChange={(v) => { setTrapSubtype(v); load(1, q, { trapSubtype: v}); }}
                options={[ { value: "", label: "Tous" }, ...toOptions(TRAP_SUBTYPES, tTrapSubtype) ]}
                variant="solid"
                usePortal
                placeholder="Sous-type"
              />
            </div>
          )}
        </div>

        {/* Ranges Monstres */}
        {cardType === "MONSTER" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs opacity-70">Niveau min</label>
                <input value={levelMin} onChange={(e) => setLevelMin(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
              <div>
                <label className="mb-1 block text-xs opacity-70">Niveau max</label>
                <input value={levelMax} onChange={(e) => setLevelMax(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs opacity-70">ATK min</label>
                <input value={atkMin} onChange={(e) => setAtkMin(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
              <div>
                <label className="mb-1 block text-xs opacity-70">ATK max</label>
                <input value={atkMax} onChange={(e) => setAtkMax(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs opacity-70">DEF min</label>
                <input value={defMin} onChange={(e) => setDefMin(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
              <div>
                <label className="mb-1 block text-xs opacity-70">DEF max</label>
                <input value={defMax} onChange={(e) => setDefMax(e.target.value)}
                  inputMode="numeric" className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 outline-none ring-1 ring-white/10 focus:border-white/20 focus:ring-2 focus:ring-indigo-400/60" />
              </div>
            </div>
          </div>
        )}

        {/* Filtres stock / ban */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs opacity-70">Stock</label>
            <GlassSelect
              value={stockFilter}
              onChange={(v) => { const nv = v as StockFilter; setStockFilter(nv); load(1, q, { stock: nv }); }}
              options={[
                { value: "all", label: "Tous" },
                { value: "owned", label: "En stock" },
                { value: "unowned", label: "Hors stock" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs opacity-70">Banlist TCG</label>
            <GlassSelect
              value={banFilter}
              onChange={(v) => { const nv = v as BanFilter; setBanFilter(nv); load(1, q, { ban: nv }); }}
              options={[
                { value: "any", label: "Toutes" },
                { value: "legal", label: "Autorisé" },
                { value: "semi_limited", label: "Semi-limitée (2)" },
                { value: "limited", label: "Limitée (1)" },
                { value: "banned", label: "Bannie" },
              ]}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => load(1, q)}
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 transition hover:bg-white/20"
            >
              Appliquer
            </button>
            <button
              onClick={clearFilters}
              className="h-10 flex-1 rounded-xl bg-gradient-to-r from-slate-500 to-slate-700 px-4 font-semibold ring-1 ring-white/10 transition hover:brightness-110"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Résumé / pagination top */}
      <div className="mb-3 flex flex-col md:flex-row items-center justify-between text-sm text-white/70 gap-2">
        <div>
          {data ? (
            <>Résultats : <b>{data.total}</b>{q ? <> • filtre « {q} »</> : null}</>
          ) : (
            <>Chargement…</>
          )}
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => page > 1 && load(page - 1, q)}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button
              onClick={() => page < totalPages && load(page + 1, q)}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Grid cartes */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 relative z-0">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <li key={`sk-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <div className="flex gap-3">
                <div className="h-28 w-20 animate-pulse rounded-lg bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-28 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-8 w-10 animate-pulse rounded-lg bg-white/10" />
                    <div className="h-8 w-12 animate-pulse rounded-lg bg-white/10" />
                  </div>
                </div>
              </div>
            </li>
          ))}

        {!loading && data?.data?.length === 0 && (
          <li className="col-span-full">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/70 backdrop-blur">
              Aucune carte trouvée.
            </div>
          </li>
        )}

        {!loading &&
          data?.data?.map((c) => {
            const qty = stock[c.id] ?? 0;
            const isUpdating = !!updating[c.id];
            const cardBase =
              "group rounded-2xl p-3 backdrop-blur transition border " +
              (qty > 0
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 border-white/10 text-white"
                : "bg-white/5 border-white/10 text-white hover:bg-white/[0.07]");
            return (
              <li key={c.id} className={cardBase}>
                <div className="flex gap-3">
                  <div className="relative">
                    {c.imageSmallUrl ? (
                      <img
                        src={c.imageSmallUrl}
                        alt={c.name}
                        className="h-28 w-20 rounded-lg object-cover ring-1 ring-white/10 cursor-pointer"
                        loading="lazy"
                        onClick={() => openDetail(c.id)}
                      />
                    ) : (
                      <div className="h-28 w-20 rounded-lg bg-white/10" />
                    )}
                    {/* Badge qty */}
                    <div className="absolute -right-2 -top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold ring-1 ring-white/10">
                      x{qty}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-xs opacity-80">{c.type ?? "\u00A0"}</div>

                    <div className="mt-auto flex items-center gap-2 pt-3">
                      {/* -1 */}
                      <button
                        onClick={() => setQty(c.id, qty - 1)}
                        disabled={isUpdating || qty <= 0}
                        className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg border border-white/10 bg-white/10 px-2 text-sm transition hover:bg-white/20 disabled:opacity-40"
                      >
                        -1
                      </button>

                      {/* +1 */}
                      <button
                        onClick={() => setQty(c.id, qty + 1)}
                        disabled={isUpdating}
                        className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-gradient-to-r from-amber-300 to-amber-700 px-3 text-sm ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-60"
                      >
                        +1
                      </button>

                      {/* +3 */}
                      <button
                        onClick={() => setQty(c.id, qty + 3)}
                        disabled={isUpdating}
                        className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 text-sm ring-1 ring-white/10 transition hover:brightness-110 disabled:opacity-60"
                      >
                        +3
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
      </ul>

      {/* Pagination bottom */}
      {data && (
        <div className="mt-5 flex items-center justify-between text-sm text-white/70">
          <div>
            Page <b>{page}</b> / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => page > 1 && load(page - 1, q)}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => page < totalPages && load(page + 1, q)}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1 transition hover:bg-white/20 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResult={handleScanResult}
      />

      <CardDetailModal
        cardId={selectedId}
        open={detailOpen}
        onClose={closeDetail}
      />
    </main>
  );
}
