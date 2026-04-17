"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Filter, X, ChevronRight, MapPin } from "lucide-react";
import { STAR_ITINERARIES_EDITORIAL_BY_REGION } from "@/content/inspiration/star-itineraries-editorial/index";
import { MAP_REGIONS } from "@/lib/inspiration-map-regions-config";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import StarFlipCard from "./StarFlipCard";

type RegionMeta = { id: string; name: string; count: number };

type Props = {
  initialRegionFilter?: string;
};

function buildRegionMeta(): RegionMeta[] {
  return MAP_REGIONS.filter(
    (r) => STAR_ITINERARIES_EDITORIAL_BY_REGION[r.id]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    count:
      STAR_ITINERARIES_EDITORIAL_BY_REGION[r.id]?.itineraries?.length ?? 0,
  }));
}

type GroupedTheme = {
  theme: string;
  regionId: string;
  regionName: string;
  items: StarItineraryEditorialItem[];
};

type CrossRegionTheme = {
  keyword: string;
  label: string;
  items: (StarItineraryEditorialItem & { _regionName: string })[];
};

const CROSS_THEMES: { keyword: string; label: string }[] = [
  { keyword: "littoral", label: "Littoral & Plages" },
  { keyword: "châteaux", label: "Châteaux & Patrimoine" },
  { keyword: "montagne", label: "Montagne & Altitude" },
  { keyword: "vigno", label: "Vignobles & Vins" },
  { keyword: "village", label: "Villages de Charme" },
  { keyword: "gorge", label: "Gorges & Vallées" },
  { keyword: "forêt", label: "Forêts & Nature" },
];

function buildCrossRegionThemes(regions: RegionMeta[]): CrossRegionTheme[] {
  const result: CrossRegionTheme[] = [];

  for (const ct of CROSS_THEMES) {
    const items: CrossRegionTheme["items"] = [];
    for (const r of regions) {
      const file = STAR_ITINERARIES_EDITORIAL_BY_REGION[r.id];
      if (!file?.itineraries) continue;
      for (const it of file.itineraries) {
        const low = (it.themeTitle + " " + it.tripTitle).toLowerCase();
        if (low.includes(ct.keyword)) {
          items.push({ ...it, _regionName: r.name });
        }
      }
    }
    if (items.length >= 3) {
      result.push({ ...ct, items: items.slice(0, 12) });
    }
  }
  return result;
}

function groupByTheme(
  regionId: string | null,
  regions: RegionMeta[]
): GroupedTheme[] {
  const targets = regionId ? [regionId] : regions.map((r) => r.id);
  const groups: GroupedTheme[] = [];

  for (const rid of targets) {
    const file = STAR_ITINERARIES_EDITORIAL_BY_REGION[rid];
    if (!file?.itineraries) continue;
    const regionName =
      MAP_REGIONS.find((r) => r.id === rid)?.name ?? rid;
    const themeMap = new Map<string, StarItineraryEditorialItem[]>();
    for (const it of file.itineraries) {
      const arr = themeMap.get(it.themeTitle) ?? [];
      arr.push(it);
      themeMap.set(it.themeTitle, arr);
    }
    for (const [theme, items] of themeMap) {
      groups.push({ theme, regionId: rid, regionName, items });
    }
  }
  return groups;
}

export default function InspirerStars({ initialRegionFilter }: Props) {
  const searchParams = useSearchParams();
  const [regionFilter, setRegionFilter] = useState<string | null>(
    initialRegionFilter ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flippedSlug, setFlippedSlug] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialRegionFilter) setRegionFilter(initialRegionFilter);
  }, [initialRegionFilter]);

  /** Deep links / retour navigateur : ?region=bretagne */
  useEffect(() => {
    const r = searchParams.get("region");
    if (r) setRegionFilter(r);
  }, [searchParams]);

  const regionsMeta = useMemo(buildRegionMeta, []);
  const grouped = useMemo(
    () => groupByTheme(regionFilter, regionsMeta),
    [regionFilter, regionsMeta]
  );
  const crossThemes = useMemo(
    () => (!regionFilter ? buildCrossRegionThemes(regionsMeta) : []),
    [regionFilter, regionsMeta]
  );

  const handleSelectRegion = useCallback(
    (id: string | null) => {
      setRegionFilter(id);
      setSidebarOpen(false);
      setFlippedSlug(null);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    []
  );

  const handleFlip = useCallback(
    (slug: string) => {
      setFlippedSlug((prev) => (prev === slug ? null : slug));
    },
    []
  );

  const totalCount = useMemo(
    () => grouped.reduce((acc, g) => acc + g.items.length, 0),
    [grouped]
  );

  const activeRegionName = useMemo(() => {
    if (!regionFilter) return "Toutes les régions";
    return regionsMeta.find((r) => r.id === regionFilter)?.name ?? regionFilter;
  }, [regionFilter, regionsMeta]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#111111]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/6 bg-[#111111]/95 px-4 py-3 backdrop-blur-lg">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-courier text-[11px] font-bold text-white/60 transition hover:border-[#E07856]/30 hover:text-white/80"
        >
          <Filter className="h-3.5 w-3.5 text-[#E07856]" />
          {activeRegionName}
        </button>
        <div className="flex items-center gap-2">
          <Image src="/A1.png" alt="" width={16} height={16} className="opacity-30" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }} />
          <span className="font-courier text-[10px] text-white/25">
            {totalCount} itinéraire{totalCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main scroll area */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="px-4 py-4">
          {/* Cross-region theme carousels (only when no filter) */}
          {crossThemes.map((ct) => (
            <div key={ct.keyword} className="mb-10">
              <h3 className="mb-4 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
                {ct.label}
              </h3>
              <div className="flex flex-col gap-5">
                {ct.items.map((it) => (
                  <StarFlipCard
                    key={it.itinerarySlug}
                    itinerary={it}
                    isFlipped={flippedSlug === it.itinerarySlug}
                    onFlip={() => handleFlip(it.itinerarySlug)}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Region-specific themes */}
          {grouped.map((group) => (
            <div key={`${group.regionId}-${group.theme}`} className="mb-8">
              <div className="mb-3">
                {!regionFilter && (
                  <button
                    onClick={() => handleSelectRegion(group.regionId)}
                    className="mb-1 flex items-center gap-1 font-courier text-[10px] font-bold uppercase tracking-wider text-[#E07856]/50 transition hover:text-[#E07856]"
                  >
                    <MapPin className="h-3 w-3" />
                    {group.regionName}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <h3 className="font-courier text-sm font-bold leading-snug text-white/75">
                  {group.theme}
                </h3>
              </div>

              <div className="space-y-4">
                {group.items.map((it) => (
                  <StarFlipCard
                    key={it.itinerarySlug}
                    itinerary={it}
                    isFlipped={flippedSlug === it.itinerarySlug}
                    onFlip={() => handleFlip(it.itinerarySlug)}
                  />
                ))}
              </div>
            </div>
          ))}

          {grouped.length === 0 && crossThemes.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="font-courier text-sm text-white/25">
                Aucun itinéraire pour cette sélection.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-30 flex"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 flex h-full w-64 flex-col border-r border-white/6 bg-[#0e0e0e]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <span className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
                Régions
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white/30 transition hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              <button
                onClick={() => handleSelectRegion(null)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-courier text-xs transition ${
                  !regionFilter
                    ? "bg-[#E07856]/10 font-bold text-[#E07856]"
                    : "text-white/40 hover:bg-white/3 hover:text-white/60"
                }`}
              >
                <span>Toutes les régions</span>
                <span className="text-[10px] text-white/20">
                  {regionsMeta.reduce((a, r) => a + r.count, 0)}
                </span>
              </button>

              {regionsMeta.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRegion(r.id)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-courier text-xs transition ${
                    regionFilter === r.id
                      ? "bg-[#E07856]/10 font-bold text-[#E07856]"
                      : "text-white/40 hover:bg-white/3 hover:text-white/60"
                  }`}
                >
                  <span>{r.name}</span>
                  <span className="text-[10px] text-white/20">{r.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
