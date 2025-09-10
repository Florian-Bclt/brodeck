"use client";
import { useEffect, useState } from "react";

type CardRow = { id: number; name: string; type?: string | null; imageSmallUrl?: string | null };
type ListResp = { total: number; page: number; pageSize: number; data: CardRow[] };

export default function CardsPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<ListResp | null>(null);

  async function load(page = 1) {
    const res = await fetch(`/api/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=30`);
    setData(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function setQty(cardId: number, qty: number) {
    await fetch("/api/ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
      body: JSON.stringify({ cardId, qty }),
    });
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl px-4 py-2 bg-neutral-900 text-neutral-100 ring-1 ring-neutral-800"
          placeholder="Rechercher une carte (ex: Dark Magician)"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load()}
        />
        <button onClick={() => load()} className="px-4 py-2 rounded-xl bg-white text-black">
          Rechercher
        </button>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {data?.data.map(c => (
          <li key={c.id} className="rounded-2xl p-3 bg-neutral-900 ring-1 ring-neutral-800">
            <div className="flex gap-3">
              {c.imageSmallUrl ? (
                <img src={c.imageSmallUrl} alt={c.name} className="w-20 h-28 object-cover rounded-lg" />
              ) : (
                <div className="w-20 h-28 rounded-lg bg-neutral-800" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm opacity-70">{c.type ?? "\u00A0"}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setQty(c.id, 0)} className="px-2 py-1 rounded-lg bg-neutral-800">0</button>
                  <button onClick={() => setQty(c.id, 1)} className="px-2 py-1 rounded-lg bg-neutral-800">+1</button>
                  <button onClick={() => setQty(c.id, 3)} className="px-2 py-1 rounded-lg bg-neutral-800">+3</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
