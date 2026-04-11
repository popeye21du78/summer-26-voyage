"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Filter, Heart, Search } from "lucide-react";
import type { FeatureCollection } from "geojson";
import { useRouter } from "next/navigation";
import {
  AMBIANCE_OPTIONS,
  DURATION_OPTIONS,
  filterTerritoriesByInspiration,
  getTerritoryById,
  listTerritories,
  type InspirationAmbianceFilter,
  type InspirationDurationFilter,
  type TerritoriesFeatureCollection,
} from "@/lib/editorial-territories";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import {
  bboxForRegionFeature,
  bboxFromLineString,
  lieuxToPointCollection,
  starItinerariesToLineCollection,
  territoriesToPointCollection,
  type SlimLieuPoint,
} from "@/lib/inspiration-map-geo";
import { starItineraryById, starItinerariesByRegion } from "@/content/inspiration/star-itineraries";
import InspirationMapClient, {
  type InspirationMapExpose,
} from "@/components/planifier/InspirationMapClient";
import MapBottomPanels from "./MapBottomPanels";
import RegionCarousel from "./RegionCarousel";
import TopBar from "./TopBar";

const MAP_REGIONS_GEO_URL = "/geo/inspiration-map-regions.geojson";
const MAP_REGIONS_OUTLINE_URL = "/geo/inspiration-map-regions-outline.geojson";

type Props = { mapboxAccessToken: string | undefined };

/** Joint carte / fiche : zone tactile large + touch iOS (passive: false sur touchmove). */
function RegionSplitGutter({
  onDragStart,
  onDrag,
}: {
  onDragStart?: () => void;
  onDrag?: (offsetY: number) => void;
}) {
  const startY = useRef(0);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      onDragStart?.();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      onDrag?.(e.touches[0].clientY - startY.current);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [onDrag, onDragStart]);

  return (
    <div
      ref={elRef}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Redimensionner carte et fiche"
      className="relative z-30 flex min-h-[22px] shrink-0 cursor-row-resize touch-none select-none items-center justify-center border-y border-[#A55734]/12 bg-[#FFFBF8] active:bg-[#FFF2EB]"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startY.current = e.clientY;
        onDragStart?.();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
        onDrag?.(e.clientY - startY.current);
      }}
      onPointerUp={(e) => {
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onPointerCancel={(e) => {
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
    >
      <div className="pointer-events-none h-1.5 w-16 rounded-full bg-[#A55734]/45 shadow-sm" />
    </div>
  );
}

/** Filtres / favoris / recherche — vue France mobile (desktop : TopBar). */
function InspirationMobileChrome() {
  const {
    top,
    filterSheetOpen,
    setFilterSheetOpen,
    searchQuery,
    setSearchQuery,
    ambiance,
    setAmbiance,
    duration,
    setDuration,
  } = useInspirationMap();
  const [searchOpen, setSearchOpen] = useState(false);

  function toggleAmbiance(id: InspirationAmbianceFilter) {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (top.screen !== "france") return null;

  return (
    <>
      {searchOpen && (
        <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-[60] flex justify-center px-3 pt-2 lg:hidden">
          <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-[#A55734]/20 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
            <Search className="h-4 w-4 shrink-0 text-[#A55734]/60" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Région…"
              className="min-w-0 flex-1 bg-transparent font-courier text-sm text-[#333] outline-none placeholder:text-[#333]/45"
              autoFocus
            />
            <button
              type="button"
              className="shrink-0 font-courier text-xs font-bold text-[#A55734]"
              onClick={() => setSearchOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {filterSheetOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[50] bg-black/25 lg:hidden"
          aria-label="Fermer les filtres"
          onClick={() => setFilterSheetOpen(false)}
        />
      )}
      <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[52] flex -translate-x-1/2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSearchOpen((o) => !o)}
          className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-md backdrop-blur-sm ${
            searchOpen || searchQuery
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white/95 text-[#A55734]"
          }`}
          aria-label="Recherche"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          className={`pointer-events-auto flex h-12 items-center gap-1.5 rounded-full border px-4 shadow-md backdrop-blur-sm ${
            filterSheetOpen
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white/95 text-[#A55734]"
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="font-courier text-xs font-bold">Filtres</span>
        </button>
        <Link
          href="/planifier/favoris"
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#A55734]/25 bg-white/95 text-[#A55734] shadow-md backdrop-blur-sm"
          aria-label="Favoris"
        >
          <Heart className="h-5 w-5" />
        </Link>
      </div>
      {filterSheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[55] max-h-[55vh] overflow-y-auto rounded-t-2xl border border-[#A55734]/15 bg-[#FFFBF8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] lg:hidden">
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
    </>
  );
}

export default function InspirationMapScreen({ mapboxAccessToken }: Props) {
  const ctx = useInspirationMap();
  const { top, selectTerritoryPoi, resetFrance, goBack } = ctx;
  const router = useRouter();

  const mapRef = useRef<InspirationMapExpose>(null);
  /** Premier zoom région après vue France : resize layout + easing plus doux. */
  const pendingFirstSplitFit = useRef(true);
  const sheetDragStartShare = useRef(0.5);
  const [mapReady, setMapReady] = useState(false);
  const onMapReady = useCallback(() => setMapReady(true), []);
  /** Part de la hauteur carte (0–1) : ~0,5 = moitié écran carte / moitié fiche. */
  const [mapRowShare, setMapRowShare] = useState(0.5);
  const [mapZoom, setMapZoom] = useState(7.5);
  const [sectorsFc, setSectorsFc] = useState<TerritoriesFeatureCollection | null>(null);
  const [outlineFc, setOutlineFc] = useState<FeatureCollection | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("loading");

  const all = useMemo(() => listTerritories(), []);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    Promise.all([
      fetch(MAP_REGIONS_GEO_URL, { cache: "force-cache" }).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<TerritoriesFeatureCollection>;
      }),
      fetch(MAP_REGIONS_OUTLINE_URL, { cache: "force-cache" })
        .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
        .catch(() => null),
    ])
      .then(([data, outline]) => {
        if (cancelled) return;
        setSectorsFc(data);
        setOutlineFc(outline ?? null);
        setLoadState("idle");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRegionId =
    top.screen !== "france" && "regionId" in top ? top.regionId : null;

  const showRegionSplit = top.screen !== "france";

  const prevTopScreen = useRef(top.screen);
  useEffect(() => {
    if (prevTopScreen.current === "france" && top.screen !== "france") {
      /* Plus de fiche région visible par défaut (photo + texte). */
      setMapRowShare(0.36);
    }
    prevTopScreen.current = top.screen;
  }, [top.screen]);

  useEffect(() => {
    if (top.screen === "france") pendingFirstSplitFit.current = true;
  }, [top.screen]);

  const onSheetHandleDragStart = useCallback(() => {
    sheetDragStartShare.current = mapRowShare;
  }, [mapRowShare]);

  const onSheetHandleDrag = useCallback((offsetY: number) => {
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const next = sheetDragStartShare.current + offsetY / h;
    setMapRowShare(Math.min(0.92, Math.max(0.08, next)));
  }, []);

  const [villePoints, setVillePoints] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!activeRegionId || !showRegionSplit) {
      setVillePoints(null);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set("regionId", activeRegionId);
    qs.set("zoom", String(mapZoom));
    qs.set("variant", "map");
    for (const a of ctx.ambiance) qs.append("ambiance", a);
    fetch(`/api/inspiration/lieux-region?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { lieux?: SlimLieuPoint[] }) => {
        if (cancelled || !Array.isArray(d.lieux)) return;
        setVillePoints(lieuxToPointCollection(d.lieux));
      })
      .catch(() => {
        if (!cancelled) setVillePoints(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, showRegionSplit, ctx.ambiance, mapZoom]);

  const territoryPoints = useMemo(() => {
    const show =
      top.screen === "region-preview" ||
      top.screen === "region-explore" ||
      top.screen === "poi-detail";
    if (!show || !activeRegionId) return null;
    const list = filterTerritoriesByInspiration(
      all,
      ctx.ambiance,
      ctx.duration,
      activeRegionId
    );
    return territoriesToPointCollection(list, null);
  }, [top.screen, activeRegionId, all, ctx.ambiance, ctx.duration]);

  const onMapBackgroundClick = useCallback(() => {
    if (top.screen === "region-preview") resetFrance();
    else if (
      top.screen === "region-explore" ||
      top.screen === "poi-detail" ||
      top.screen === "star-list" ||
      top.screen === "star-detail"
    ) {
      goBack();
    }
  }, [top.screen, resetFrance, goBack]);

  const onVilleClick = useCallback(
    (slug: string) => {
      router.push(`/ville/${encodeURIComponent(slug)}?from=inspiration`);
    },
    [router]
  );

  const { starLineFeatures, showStarLines } = useMemo(() => {
    if (
      !activeRegionId ||
      (top.screen !== "star-list" && top.screen !== "star-detail")
    ) {
      return { starLineFeatures: null, showStarLines: false };
    }
    const items = starItinerariesByRegion(activeRegionId);
    const hl =
      top.screen === "star-detail" && "itineraryId" in top
        ? top.itineraryId
        : null;
    return {
      starLineFeatures: starItinerariesToLineCollection(items, hl),
      showStarLines: items.length > 0,
    };
  }, [top, activeRegionId]);

  useEffect(() => {
    if (!mapReady || !sectorsFc || !mapRef.current) return;

    if (top.screen === "france") {
      mapRef.current.fitFranceOverview();
      return;
    }

    if (top.screen === "star-detail" && "itineraryId" in top) {
      const it = starItineraryById(top.itineraryId);
      if (it) {
        mapRef.current.fitBounds(bboxFromLineString(it.geometry));
      }
      return;
    }

    if (top.screen === "poi-detail" && "territoryId" in top) {
      const t = getTerritoryById(top.territoryId);
      if (t) mapRef.current.flyTo(t.center[0], t.center[1], 9.2);
      return;
    }

    if (activeRegionId) {
      const b = bboxForRegionFeature(sectorsFc, activeRegionId);
      if (!b) return;
      const isFirstSplit = pendingFirstSplitFit.current && showRegionSplit;
      const duration = isFirstSplit ? 1680 : 1050;
      mapRef.current.fitBounds(b, {
        afterLayout: isFirstSplit,
        duration,
      });
      if (isFirstSplit) pendingFirstSplitFit.current = false;
    }
  }, [mapReady, top, sectorsFc, activeRegionId, showRegionSplit]);

  const dimOtherRegions = top.screen !== "france";

  if (!mapboxAccessToken) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-courier text-sm text-[#333]">
        Configure <code className="rounded bg-white px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> pour la
        carte.
      </p>
    );
  }

  const mapBaseProps = {
    data: sectorsFc,
    outlineData: outlineFc,
    mapboxAccessToken,
    selectedRegionId: activeRegionId,
    dimOtherRegions,
    territoryPoints,
    territoryPointCount: territoryPoints?.features.length ?? 0,
    showTerritoryPoints: !!territoryPoints?.features.length,
    villePoints,
    villePointCount: villePoints?.features.length ?? 0,
    showVillePoints: !!villePoints?.features.length,
    starLineFeatures,
    showStarLines,
    onSelectRegion: (id: string) => ctx.selectRegion(id),
    onTerritoryPointClick: (tid: string) => selectTerritoryPoi(tid),
    onVilleClick,
    onMapBackgroundClick,
    onMapReady,
    onZoomChange: setMapZoom,
    loading: loadState === "loading",
    loadError: loadState === "error",
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FFF8F0] md:rounded-2xl md:border md:border-[#A55734]/15 md:shadow-lg">
      <div className="hidden lg:block">
        <TopBar />
      </div>
      <InspirationMobileChrome />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {showRegionSplit ? (
          <div
            className="grid min-h-0 flex-1 overflow-hidden"
            style={{
              gridTemplateRows: `${mapRowShare}fr 22px ${1 - mapRowShare}fr`,
            }}
          >
            <div className="relative min-h-0 overflow-hidden">
              <InspirationMapClient ref={mapRef} {...mapBaseProps} />
            </div>
            <RegionSplitGutter
              onDragStart={onSheetHandleDragStart}
              onDrag={onSheetHandleDrag}
            />
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-[#A55734]/15 bg-[#FFFBF8]">
              <MapBottomPanels />
            </div>
          </div>
        ) : (
          <>
            <div className="relative min-h-0 flex-1">
              <InspirationMapClient ref={mapRef} {...mapBaseProps} />
              {top.screen === "france" && (
                <>
                  <div className="pointer-events-none absolute left-0 right-0 top-2 z-10 hidden justify-center px-3 lg:flex">
                    <p className="max-w-md rounded-full border border-[#A55734]/15 bg-white/95 px-3 py-1.5 text-center font-courier text-[10px] leading-snug text-[#333]/85 shadow-sm backdrop-blur-sm">
                      Vue France — touche une région sur la carte ou fais défiler les cartes en bas
                    </p>
                  </div>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20">
                    <div className="pointer-events-auto">
                      <RegionCarousel />
                    </div>
                  </div>
                </>
              )}
            </div>
            <MapBottomPanels />
          </>
        )}
      </div>
    </div>
  );
}
