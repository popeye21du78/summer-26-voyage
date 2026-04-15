"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search as SearchIcon, MapPin } from "lucide-react";
import { listTerritories, type EditorialTerritory } from "@/lib/editorial-territories";

export default function InspirerSearch() {
  const [query, setQuery] = useState("");
  const [territories, setTerritories] = useState<EditorialTerritory[]>([]);
  const [filtered, setFiltered] = useState<EditorialTerritory[]>([]);

  useEffect(() => {
    const all = listTerritories();
    setTerritories(all);
    setFiltered(all.slice(0, 20));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(territories.slice(0, 20));
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      territories.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      )
    );
  }, [query, territories]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#111111]">
      {/* Search bar */}
      <div className="sticky top-0 z-10 border-b border-white/6 bg-[#111111]/95 px-4 pb-3 pt-4 backdrop-blur-lg">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E07856]/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une ville, une région, un lieu…"
            className="w-full rounded-xl border border-white/8 bg-white/5 py-2.5 pl-10 pr-4 font-courier text-sm text-white placeholder:text-white/25 focus:border-[#E07856]/40 focus:outline-none focus:ring-1 focus:ring-[#E07856]/25"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center font-courier text-sm text-white/30">
            Aucun résultat pour « {query} »
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/inspirer/region/${t.id}`}
                className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-3.5 transition hover:border-[#E07856]/20 hover:bg-white/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E07856]/15">
                  <MapPin className="h-4 w-4 text-[#E07856]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-courier text-sm font-bold text-white/90">
                    {t.name}
                  </p>
                  {t.tags && t.tags.length > 0 && (
                    <p className="truncate font-courier text-[11px] text-white/40">
                      {t.tags.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
