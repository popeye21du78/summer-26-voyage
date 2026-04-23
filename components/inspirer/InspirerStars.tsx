"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, X, ChevronRight, MapPin } from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import { STAR_ITINERARIES_EDITORIAL_BY_REGION } from "@/content/inspiration/star-itineraries-editorial/index";
import { MAP_REGIONS } from "@/lib/inspiration-map-regions-config";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import StarFlipCard from "./StarFlipCard";

type RegionMeta = { id: string; name: string; count: number };

type Props = {
  initialRegionFilter?: string;
  searchQuery: string;
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

function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function itineraryMatchesQuery(it: StarItineraryEditorialItem, q: string) {
  if (!q) return true;
  const hay = normalizeSearch(
    `${it.tripTitle} ${it.themeTitle} ${it.regionId ?? ""}`
  );
  return hay.includes(q);
}

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

export default function InspirerStars({ initialRegionFilter, searchQuery }: Props) {
  const searchParams = useSearchParams();
  const [regionFilter, setRegionFilter] = useState<string | null>(
    initialRegionFilter ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Clé unique région + itinéraire (évite collision de slug entre régions). */
  const [flippedKey, setFlippedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [filtersHidden, setFiltersHidden] = useState(false);

  useEffect(() => {
    if (initialRegionFilter) setRegionFilter(initialRegionFilter);
  }, [initialRegionFilter]);

  /** Deep links / retour navigateur : ?region=bretagne */
  useEffect(() => {
    const r = searchParams.get("region");
    if (r) setRegionFilter(r);
  }, [searchParams]);

  /** Une seule requête : toutes les validations maintenance → résolution sans /api/photo-resolve partout. */
  useEffect(() => {
    void loadPhotoValidationSnapshot();
  }, []);

  const regionsMeta = useMemo(buildRegionMeta, []);
  const grouped = useMemo(
    () => groupByTheme(regionFilter, regionsMeta),
    [regionFilter, regionsMeta]
  );
  const crossThemes = useMemo(
    () => (!regionFilter ? buildCrossRegionThemes(regionsMeta) : []),
    [regionFilter, regionsMeta]
  );

  const qNorm = useMemo(
    () => normalizeSearch(searchQuery.trim()),
    [searchQuery]
  );

  const groupedFiltered = useMemo(() => {
    if (!qNorm) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => itineraryMatchesQuery(it, qNorm)),
      }))
      .filter((g) => g.items.length > 0);
  }, [grouped, qNorm]);

  const crossThemesFiltered = useMemo(() => {
    if (!qNorm) return crossThemes;
    return crossThemes
      .map((ct) => ({
        ...ct,
        items: ct.items.filter((it) => itineraryMatchesQuery(it, qNorm)),
      }))
      .filter((ct) => ct.items.length > 0);
  }, [crossThemes, qNorm]);

  const handleSelectRegion = useCallback(
    (id: string | null) => {
      setRegionFilter(id);
      setSidebarOpen(false);
      setFlippedKey(null);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    []
  );

  const starCardKey = useCallback(
    (it: StarItineraryEditorialItem) => `${it.regionId}:${it.itinerarySlug}`,
    []
  );

  const handleFlip = useCallback((key: string) => {
    setFlippedKey((prev) => (prev === key ? null : key));
  }, []);

  const totalCount = useMemo(
    () => groupedFiltered.reduce((acc, g) => acc + g.items.length, 0),
    [groupedFiltered]
  );

  const activeRegionName = useMemo(() => {
    if (!regionFilter) return "Toutes les régions";
    return regionsMeta.find((r) => r.id === regionFilter)?.name ?? regionFilter;
  }, [regionFilter, regionsMeta]);

  const onMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    const delta = y - lastScrollY.current;
    lastScrollY.current = y;
    if (y < 20) {
      setFiltersHidden(false);
      return;
    }
    if (delta > 8) setFiltersHidden(true);
    else if (delta < -8) setFiltersHidden(false);
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-bg-main)]">
      {/* Région + raccourcis profils (recherche : TopBar commune) */}
      <div
        className={`shrink-0 overflow-hidden border-b border-white/6 bg-[var(--color-bg-main)]/95 backdrop-blur-lg transition-[max-height,opacity] duration-200 ease-out ${
          filtersHidden
            ? "pointer-events-none max-h-0 border-0 opacity-0"
            : "max-h-[min(220px,38vh)] opacity-100"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-courier text-[11px] font-bold text-white/60 transition hover:border-[var(--color-accent-start)]/30 hover:text-white/80"
          >
            <Filter className="h-3.5 w-3.5 text-[var(--color-accent-start)]" />
            {activeRegionName}
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo
              variant="mark"
              tone="accentSoft"
              size={14}
              style={{ opacity: 0.85 }}
            />
            <span className="font-courier text-[10px] text-white/25">
              {totalCount} itinéraire{totalCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {/**
         * Les profils « Voyageurs éditoriaux » sont volontairement retirés de la vue par défaut
         * (trop bruyant, pas utile en entrée). Ils restent accessibles via les suggestions de recherche
         * ou le profil public. Un placeholder reste pour conserver une barre d'amorce homogène.
         */}
      </div>

      {/* Main scroll area */}
      <div
        ref={scrollRef}
        onScroll={onMainScroll}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="px-4 py-4 pb-bottom-nav">
          {/* Cross-region theme carousels (only when no filter) */}
          {crossThemesFiltered.map((ct) => (
            <div key={ct.keyword} className="mb-10">
              <h3 className="mb-4 font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                {ct.label}
              </h3>
              <div className="flex flex-col gap-5">
                {ct.items.map((it) => (
                  <StarFlipCard
                    key={`${it.regionId}-${it.itinerarySlug}`}
                    itinerary={it}
                    isFlipped={flippedKey === starCardKey(it)}
                    onFlip={() => handleFlip(starCardKey(it))}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Region-specific themes */}
          {groupedFiltered.map((group) => (
            <div key={`${group.regionId}-${group.theme}`} className="mb-8">
              <div className="mb-3">
                {!regionFilter && (
                  <button
                    onClick={() => handleSelectRegion(group.regionId)}
                    className="mb-1 flex items-center gap-1 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/50 transition hover:text-[var(--color-accent-start)]"
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
                    key={`${group.regionId}-${it.itinerarySlug}`}
                    itinerary={it}
                    isFlipped={flippedKey === starCardKey(it)}
                    onFlip={() => handleFlip(starCardKey(it))}
                  />
                ))}
              </div>
            </div>
          ))}

          {groupedFiltered.length === 0 && crossThemesFiltered.length === 0 && (
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
            className="relative z-10 flex h-full w-64 flex-col border-r border-white/6 bg-[var(--color-bg-main)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <span className="font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
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
                    ? "bg-[var(--color-accent-start)]/10 font-bold text-[var(--color-accent-start)]"
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
                      ? "bg-[var(--color-accent-start)]/10 font-bold text-[var(--color-accent-start)]"
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
