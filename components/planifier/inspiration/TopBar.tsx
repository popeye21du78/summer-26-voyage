"use client";

import Link from "next/link";
import { Filter, Heart } from "lucide-react";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import {
  AMBIANCE_OPTIONS,
  DURATION_OPTIONS,
  POI_TYPE_OPTIONS,
  type InspirationAmbianceFilter,
  type InspirationDurationFilter,
  type InspirationPoiTypeFilter,
} from "@/lib/editorial-territories";
import InspirerSearchField from "@/components/inspirer/InspirerSearchField";

export type InspirerTopBarSearchOverride = {
  value: string;
  onChange: (q: string) => void;
  placeholder: string;
};

type TopBarProps = {
  /** Onglets Stars / Amis : même barre que la carte, recherche pilotée localement. */
  searchOverride?: InspirerTopBarSearchOverride;
};

export default function TopBar({ searchOverride }: TopBarProps) {
  const {
    searchQuery: ctxSearch,
    setSearchQuery: setCtxSearch,
    filterSheetOpen,
    setFilterSheetOpen,
    ambiance,
    setAmbiance,
    duration,
    setDuration,
    poiTypes,
    setPoiTypes,
  } = useInspirationMap();

  const searchQuery = searchOverride?.value ?? ctxSearch;
  const setSearchQuery = searchOverride?.onChange ?? setCtxSearch;
  const searchPlaceholder = searchOverride?.placeholder ?? "Rechercher une région…";

  function toggleAmbiance(id: InspirationAmbianceFilter) {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function togglePoiType(id: InspirationPoiTypeFilter) {
    setPoiTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <header className="relative z-30 flex shrink-0 flex-col border-b border-white/6 bg-[var(--color-bg-main)]/95 backdrop-blur-lg">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link
          href="/planifier"
          className="hidden shrink-0 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)] underline-offset-2 hover:underline sm:inline"
        >
          Hub
        </Link>
        <div className="min-w-0 flex-1">
          <InspirerSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 font-courier text-[11px] font-bold transition ${
            filterSheetOpen || ambiance.length > 0 || poiTypes.length > 0 || duration
              ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)]/25 text-[var(--color-accent-start)]"
              : "border-white/10 bg-white/5 text-white/70 hover:border-[var(--color-accent-start)]/35 hover:text-white/90"
          }`}
        >
          <Filter className="h-3.5 w-3.5 text-[var(--color-accent-start)]" />
          <span className="max-sm:sr-only">Filtres</span>
        </button>
        <Link
          href="/planifier/favoris"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-courier text-[11px] font-bold text-[var(--color-accent-start)] transition hover:border-[var(--color-accent-start)]/35 hover:bg-white/10"
        >
          <Heart className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Favoris</span>
        </Link>
      </div>

      {filterSheetOpen && (
        <div className="border-t border-white/5 bg-[var(--color-bg-main)] px-4 py-3">
          <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-start)]">
            Ambiances
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AMBIANCE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleAmbiance(o.id)}
                className={`rounded-full border px-2.5 py-1 font-courier text-[11px] font-bold transition ${
                  ambiance.includes(o.id)
                    ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)] text-white"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-[var(--color-accent-start)]/40"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-courier text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-start)]">
            Types de POI
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {POI_TYPE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => togglePoiType(o.id)}
                className={`rounded-full border px-2.5 py-1 font-courier text-[11px] font-bold transition ${
                  poiTypes.includes(o.id)
                    ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)] text-white"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-[var(--color-accent-start)]/40"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-courier text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-start)]">
            Durée
          </p>
          <select
            value={duration ?? ""}
            onChange={(e) =>
              setDuration((e.target.value || null) as InspirationDurationFilter | null)
            }
            className="mt-2 w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-courier text-xs text-white focus:border-[var(--color-accent-start)]/35 focus:outline-none"
          >
            <option value="">Toutes</option>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </header>
  );
}
