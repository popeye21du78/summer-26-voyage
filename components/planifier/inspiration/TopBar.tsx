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
    <header className="relative z-30 flex shrink-0 flex-col border-b border-[#A55734]/15 bg-[#FFF8F0]/95 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Link
          href="/planifier"
          className="hidden shrink-0 font-courier text-xs font-bold text-[#A55734] underline sm:inline"
        >
          Hub
        </Link>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A55734]/50" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une région…"
            className="w-full rounded-full border border-[#A55734]/20 bg-white py-2 pl-10 pr-4 font-courier text-sm text-[#333] placeholder:text-[#333]/45 focus:border-[#E07856] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 font-courier text-xs font-bold transition ${
            filterSheetOpen || ambiance.length > 0 || duration
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white text-[#A55734]"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtres
        </button>
        <Link
          href="/planifier/favoris"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#A55734]/25 bg-white px-3 py-2 font-courier text-xs font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
        >
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Favoris</span>
        </Link>
      </div>

      {filterSheetOpen && (
        <div className="border-t border-[#A55734]/10 bg-white/90 px-3 py-3 sm:px-4">
          <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]">
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
                    : "border-[#E07856]/35 bg-white text-[#333]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]">
            Durée
          </p>
          <select
            value={duration ?? ""}
            onChange={(e) =>
              setDuration((e.target.value || null) as InspirationDurationFilter | null)
            }
            className="mt-2 w-full max-w-xs rounded-lg border border-[#A55734]/25 bg-white px-3 py-2 font-courier text-xs text-[#333]"
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
