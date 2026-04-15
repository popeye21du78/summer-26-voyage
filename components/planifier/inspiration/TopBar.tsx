"use client";

import Link from "next/link";
import { Filter, Heart, Search } from "lucide-react";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import {
  AMBIANCE_OPTIONS,
  DURATION_OPTIONS,
  type InspirationAmbianceFilter,
  type InspirationDurationFilter,
} from "@/lib/editorial-territories";

export default function TopBar() {
  const {
    searchQuery,
    setSearchQuery,
    filterSheetOpen,
    setFilterSheetOpen,
    ambiance,
    setAmbiance,
    duration,
    setDuration,
  } = useInspirationMap();

  function toggleAmbiance(id: InspirationAmbianceFilter) {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <header className="relative z-30 flex shrink-0 flex-col border-b border-[#E07856]/15 bg-[#141414]/95 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Link
          href="/planifier"
          className="hidden shrink-0 font-courier text-xs font-bold text-[#E07856] underline sm:inline"
        >
          Hub
        </Link>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E07856]/50" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une région…"
            className="w-full rounded-full border border-[#E07856]/20 bg-white py-2 pl-10 pr-4 font-courier text-sm text-white/80 placeholder:text-white/80/45 focus:border-[#E07856] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 font-courier text-xs font-bold transition ${
            filterSheetOpen || ambiance.length > 0 || duration
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#E07856]/25 bg-white text-[#E07856]"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtres
        </button>
        <Link
          href="/planifier/favoris"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E07856]/25 bg-white px-3 py-2 font-courier text-xs font-bold text-[#E07856] transition hover:bg-[#141414]"
        >
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Favoris</span>
        </Link>
      </div>

      {filterSheetOpen && (
        <div className="border-t border-[#E07856]/10 bg-white/90 px-3 py-3 sm:px-4">
          <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#E07856]">
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
                    ? "border-[#E07856] bg-[#E07856] text-white"
                    : "border-[#E07856]/35 bg-white text-white/80"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-courier text-[10px] font-bold uppercase tracking-wide text-[#E07856]">
            Durée
          </p>
          <select
            value={duration ?? ""}
            onChange={(e) =>
              setDuration((e.target.value || null) as InspirationDurationFilter | null)
            }
            className="mt-2 w-full max-w-xs rounded-lg border border-[#E07856]/25 bg-white px-3 py-2 font-courier text-xs text-white/80"
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
