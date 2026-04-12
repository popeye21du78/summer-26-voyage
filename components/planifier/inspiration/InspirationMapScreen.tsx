"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, CheckCircle2, Filter, GraduationCap, Search } from "lucide-react";
import type { FeatureCollection, LineString } from "geojson";
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
  onDragEnd,
}: {
  onDragStart?: () => void;
  onDrag?: (offsetY: number) => void;
  onDragEnd?: () => void;
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
    const onTouchEnd = () => onDragEnd?.();
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onDrag, onDragStart, onDragEnd]);

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
        onDragEnd?.();
      }}
      onPointerCancel={(e) => {
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        onDragEnd?.();
      }}
    >
      <div className="pointer-events-none h-1.5 w-16 rounded-full bg-[#A55734]/45 shadow-sm" />
    </div>
  );
}

/** Recherche + filtres + coups de cœur — coin haut droit mobile (desktop : TopBar). */
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
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  function toggleAmbiance(id: InspirationAmbianceFilter) {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (top.screen !== "france") return null;

  return (
    <>
      {searchOpen && (
        <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.25rem)] z-[60] flex justify-center px-3 lg:hidden">
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
      {(filterSheetOpen || favoritesOpen) && (
        <button
          type="button"
          className="fixed inset-0 z-[50] bg-black/25 lg:hidden"
          aria-label="Fermer le panneau"
          onClick={() => {
            setFilterSheetOpen(false);
            setFavoritesOpen(false);
          }}
        />
      )}
      {favoritesOpen && (
        <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.25rem)] z-[58] max-h-[70vh] overflow-y-auto rounded-2xl border border-[#A55734]/15 bg-[#FFFBF8] p-4 shadow-xl lg:hidden">
          <p className="font-courier text-sm font-bold text-[#A55734]">Coups de cœur</p>
          <p className="mt-1 font-courier text-[11px] text-[#333]/65">
            Villes &amp; POI visités (à venir) · note de connaissance régions (estimée)
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]/80">
                Régions
              </p>
              <Link
                href="/planifier/favoris"
                className="mt-1 block font-courier text-xs text-[#E07856] underline"
                onClick={() => setFavoritesOpen(false)}
              >
                Voir mes régions favorites →
              </Link>
            </div>
            <div>
              <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]/80">
                POI &amp; villes
              </p>
              <Link
                href="/planifier/favoris"
                className="mt-1 block font-courier text-xs text-[#E07856] underline"
                onClick={() => setFavoritesOpen(false)}
              >
                Ouvrir les favoris planificateur →
              </Link>
            </div>
            <div>
              <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]/80">
                Itinéraires
              </p>
              <Link
                href="/planifier/favoris"
                className="mt-1 block font-courier text-xs text-[#E07856] underline"
                onClick={() => setFavoritesOpen(false)}
              >
                Itinéraires enregistrés →
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed right-3 top-[max(0.65rem,env(safe-area-inset-top))] z-[52] flex flex-col items-end gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSearchOpen((o) => !o)}
          className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur-sm ${
            searchOpen || searchQuery
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white/95 text-[#A55734]"
          }`}
          aria-label="Recherche régions"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(!filterSheetOpen)}
          className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur-sm ${
            filterSheetOpen
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white/95 text-[#A55734]"
          }`}
          aria-label="Filtres"
        >
          <Filter className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setFavoritesOpen((o) => !o)}
          className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur-sm ${
            favoritesOpen
              ? "border-[#E07856] bg-[#E07856] text-white"
              : "border-[#A55734]/25 bg-white/95 text-[#A55734]"
          }`}
          title="Coups de cœur"
          aria-label="Coups de cœur — régions, POI, itinéraires"
        >
          <Bookmark className="h-5 w-5" />
        </button>
        <span
          className="pointer-events-auto flex h-11 w-11 cursor-help items-center justify-center rounded-full border border-dashed border-[#A55734]/30 bg-white/80 text-[#A55734]/50 shadow-sm"
          title="Visité (villes & POI) — bientôt"
          aria-hidden
        >
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <span
          className="pointer-events-auto flex h-11 w-11 cursor-help items-center justify-center rounded-full border border-dashed border-[#A55734]/30 bg-white/80 text-[#A55734]/50 shadow-sm"
          title="Niveau de connaissance des régions (estimé) — bientôt"
          aria-hidden
        >
          <GraduationCap className="h-5 w-5" />
        </span>
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
  const { top, selectTerritoryPoi, resetFrance, goBack, selectRegion } = ctx;
  const router = useRouter();

  const mapRef = useRef<InspirationMapExpose>(null);
  /** Hauteur de la fiche en fraction de la fenêtre (overlay — la carte ne redimensionne jamais). */
  const sheetDragStartRatio = useRef(0.52);
  const [sheetHeightRatio, setSheetHeightRatio] = useState(0.52);
  const [mapReady, setMapReady] = useState(false);
  const onMapReady = useCallback(() => setMapReady(true), []);
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

  const showRegionSheet = top.screen !== "france";

  useEffect(() => {
    if (top.screen === "france") {
      setSheetHeightRatio(0.52);
    }
  }, [top.screen]);

  const onSheetHandleDragStart = useCallback(() => {
    sheetDragStartRatio.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  /** Tirer vers le bas = fiche plus haute ; vers le haut = plus de carte visible. */
  const onSheetHandleDrag = useCallback((offsetY: number) => {
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const next = sheetDragStartRatio.current - offsetY / h;
    setSheetHeightRatio(Math.min(0.88, Math.max(0.12, next)));
  }, []);

  const sheetHeightRatioRef = useRef(sheetHeightRatio);
  useEffect(() => {
    sheetHeightRatioRef.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  /** Petite fiche → retour France ; sinon snap confort. */
  const onGutterDragEnd = useCallback(() => {
    const sh = sheetHeightRatioRef.current;
    if (sh <= 0.28) {
      resetFrance();
      return;
    }
    if (sh >= 0.78) {
      setSheetHeightRatio(0.72);
      return;
    }
    if (sh < 0.4) setSheetHeightRatio(0.48);
    else setSheetHeightRatio(0.52);
  }, [resetFrance]);

  const [villePoints, setVillePoints] = useState<FeatureCollection | null>(null);
  const [editorialStarLines, setEditorialStarLines] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!activeRegionId || !showRegionSheet) {
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
  }, [activeRegionId, showRegionSheet, ctx.ambiance, mapZoom]);

  useEffect(() => {
    const showStar =
      activeRegionId && (top.screen === "star-list" || top.screen === "star-detail");
    if (!showStar || !activeRegionId) {
      setEditorialStarLines(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/inspiration/region-star-lines?regionId=${encodeURIComponent(activeRegionId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        if (cancelled || data?.type !== "FeatureCollection") return;
        setEditorialStarLines(data);
      })
      .catch(() => {
        if (!cancelled) setEditorialStarLines(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, top.screen]);

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
    const hlLegacy =
      top.screen === "star-detail" && top.kind === "legacy" ? top.itineraryId : null;
    const hlEditorialSlug =
      top.screen === "star-detail" && top.kind === "editorial" ? top.editorialSlug : null;

    const legacyItems = starItinerariesByRegion(activeRegionId);
    const legacyFc =
      legacyItems.length > 0
        ? starItinerariesToLineCollection(legacyItems, hlLegacy)
        : null;

    let editorialFc = editorialStarLines;
    if (editorialFc?.features?.length) {
      editorialFc = {
        ...editorialFc,
        features: editorialFc.features.map((f) => {
          const id = (f.properties as { id?: string } | null)?.id;
          return {
            ...f,
            properties: {
              ...(typeof f.properties === "object" && f.properties !== null
                ? f.properties
                : {}),
              hl: hlEditorialSlug && id === hlEditorialSlug ? 1 : 0,
            },
          };
        }),
      };
    }

    const features = [
      ...(legacyFc?.features ?? []),
      ...(editorialFc?.features ?? []),
    ];
    if (features.length === 0) {
      return { starLineFeatures: null, showStarLines: false };
    }
    return {
      starLineFeatures: { type: "FeatureCollection", features } as FeatureCollection,
      showStarLines: true,
    };
  }, [top, activeRegionId, editorialStarLines]);

  useEffect(() => {
    if (!mapReady || !sectorsFc || !mapRef.current) return;

    if (top.screen === "france") {
      mapRef.current.fitFranceOverview();
      return;
    }

    if (top.screen === "star-detail" && top.kind === "legacy") {
      const it = starItineraryById(top.itineraryId);
      if (it) {
        mapRef.current.fitBounds(bboxFromLineString(it.geometry));
      }
      return;
    }

    if (top.screen === "star-detail" && top.kind === "editorial") {
      const slug = top.editorialSlug;
      const feat = editorialStarLines?.features.find(
        (f) => (f.properties as { id?: string } | undefined)?.id === slug
      );
      const geom = feat?.geometry;
      if (geom && geom.type === "LineString") {
        mapRef.current.fitBounds(bboxFromLineString(geom as LineString));
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
      const h = typeof window !== "undefined" ? window.innerHeight : 700;
      /** Réserve visuelle pour la fiche en overlay (même logique d’un changement de région à l’autre). */
      const bottomPad = Math.round(sheetHeightRatioRef.current * h) + 32;
      mapRef.current.fitBounds(b, {
        duration: 1100,
        afterLayout: false,
        padding: { top: 48, bottom: bottomPad, left: 44, right: 44 },
      });
    }
  }, [mapReady, top, sectorsFc, activeRegionId, editorialStarLines]);

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
    onSelectRegion: selectRegion,
    onTerritoryPointClick: (tid: string) => selectTerritoryPoi(tid),
    onVilleClick,
    onMapBackgroundClick,
    onMapReady,
    onZoomChange: setMapZoom,
    loading: loadState === "loading",
    loadError: loadState === "error",
  };

  const sheetHvh = `${Math.round(sheetHeightRatio * 100)}vh`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FFF8F0] md:rounded-2xl md:border md:border-[#A55734]/15 md:shadow-lg">
      <div className="hidden lg:block">
        <TopBar />
      </div>
      <InspirationMobileChrome />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/*
          Une seule instance carte = pas de remontage / pas de resize WebGL au changement France → région.
          La fiche est en overlay : la carte reste full-bleed, comme entre deux régions.
        */}
        <div className="relative isolate min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <InspirationMapClient ref={mapRef} {...mapBaseProps} />
          </div>

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

          {showRegionSheet && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 z-[45] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border border-[#A55734]/15 bg-[#FAF4F0] shadow-[0_-8px_40px_rgba(40,20,10,0.18)]"
              style={{ height: sheetHvh }}
            >
              <RegionSplitGutter
                onDragStart={onSheetHandleDragStart}
                onDrag={onSheetHandleDrag}
                onDragEnd={onGutterDragEnd}
              />
              <div className="min-h-0 flex-1 overflow-hidden">
                <MapBottomPanels />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
