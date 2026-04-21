"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import LinkWithReturn from "@/components/LinkWithReturn";
import InspirerSearchField from "@/components/inspirer/InspirerSearchField";
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
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--color-bg-main)]">
      {/* Search bar */}
      <div className="sticky top-0 z-10 border-b border-white/6 bg-[var(--color-bg-main)]/95 px-4 pb-3 pt-4 backdrop-blur-lg">
        <InspirerSearchField
          value={query}
          onChange={setQuery}
          placeholder="Chercher une ville, une région, un lieu…"
          inputClassName="py-2.5 text-sm"
        />
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
              <LinkWithReturn
                key={t.id}
                href={`/inspirer/region/${t.id}`}
                className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-3.5 transition hover:border-[var(--color-accent-start)]/20 hover:bg-white/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-start)]/15">
                  <MapPin className="h-4 w-4 text-[var(--color-accent-start)]" />
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
              </LinkWithReturn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
