"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import {
  filterTerritoriesByInspiration,
  getTerritoryById,
  listTerritories,
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
import { getRegionEditorial } from "@/content/inspiration/regions";
import { slugFromNom } from "@/lib/slug-from-nom";
import { listFavorites } from "@/lib/planifier-favorites";
import InspirationMapClient, {
  type InspirationMapExpose,
} from "@/components/planifier/InspirationMapClient";
import type { StarItineraryStopDto } from "@/types/inspiration-star-map";
import MapBottomPanels from "./MapBottomPanels";
import RegionCarousel from "./RegionCarousel";
import { CityPhoto } from "@/components/CityPhoto";
import { withReturnTo } from "@/lib/return-to";

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
      className="relative z-30 flex min-h-[22px] shrink-0 cursor-row-resize touch-none select-none items-center justify-center border-y border-[#f5e6dc]/12 bg-gradient-to-r from-[#4a3f38] via-[#5c4d45] to-[#4a3f38] active:bg-[#5a4a42]"
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
      <div className="pointer-events-none h-2 w-[4.5rem] rounded-full bg-gradient-to-r from-[#5c3d32]/90 via-[#8a5a48]/95 to-[#5c3d32]/90 shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-white/15" />
    </div>
  );
}

export default function InspirationMapScreen({ mapboxAccessToken }: Props) {
  const ctx = useInspirationMap();
  const {
    top,
    selectTerritoryPoi,
    goBack,
    goExploreRegion,
    closeRegionMapFullscreen,
    selectRegion,
    starListPreviewLineSlug,
  } = ctx;
  const returnBase = useReturnBase();

  const mapRef = useRef<InspirationMapExpose>(null);
  /** Hauteur de la fiche en fraction de la fenêtre (overlay — la carte ne redimensionne jamais). */
  const sheetDragStartRatio = useRef(0.52);
  const [sheetHeightRatio, setSheetHeightRatio] = useState(0.52);
  const [mapReady, setMapReady] = useState(false);
  const onMapReady = useCallback(() => setMapReady(true), []);
  const [mapZoom, setMapZoom] = useState(7.5);
  /** Évite une rafale de requêtes lieux à chaque frame de zoom carte. */
  const [debouncedMapZoom, setDebouncedMapZoom] = useState(7.5);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedMapZoom(mapZoom), 380);
    return () => window.clearTimeout(id);
  }, [mapZoom]);
  const [selectedVillePreview, setSelectedVillePreview] = useState<{
    slug: string;
    nom: string;
  } | null>(null);
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

  useEffect(() => {
    setSelectedVillePreview(null);
  }, [activeRegionId, top.screen]);

  const showRegionSheet =
    top.screen !== "france" && top.screen !== "region-map-fullscreen";

  useEffect(() => {
    if (top.screen === "france") {
      setSheetHeightRatio(0.52);
      return;
    }
    if (top.screen === "region-map-fullscreen") return;
    if (top.screen === "region-preview") setSheetHeightRatio(0.34);
    else if (top.screen === "region-explore") setSheetHeightRatio(0.78);
    else setSheetHeightRatio(0.72);
  }, [top.screen]);

  const onSheetHandleDragStart = useCallback(() => {
    sheetDragStartRatio.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  /** Tirer vers le bas = fiche plus haute ; vers le haut = plus de carte visible. Seuils selon l’état UX. */
  const onSheetHandleDrag = useCallback(
    (offsetY: number) => {
      const h = typeof window !== "undefined" ? window.innerHeight : 800;
      const next = sheetDragStartRatio.current - offsetY / h;
      const mode = top.screen;
      if (mode === "region-explore" || mode === "region-preview") {
        setSheetHeightRatio(Math.min(0.92, Math.max(0.26, next)));
      } else {
        setSheetHeightRatio(Math.min(0.88, Math.max(0.12, next)));
      }
    },
    [top.screen]
  );

  const sheetHeightRatioRef = useRef(sheetHeightRatio);
  useEffect(() => {
    sheetHeightRatioRef.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  const onGutterDragEnd = useCallback(() => {
    const sh = sheetHeightRatioRef.current;
    const mode = top.screen;

    if (mode === "region-preview") {
      if (sh <= 0.26) {
        goBack();
        return;
      }
      if (sh >= 0.42) {
        goExploreRegion();
        return;
      }
      setSheetHeightRatio(0.34);
      return;
    }

    if (sh <= 0.28 && mode !== "region-map-fullscreen") {
      goBack();
      return;
    }

    if (mode === "region-explore") {
      if (sh <= 0.38) {
        goBack();
        return;
      }
      if (sh >= 0.82) setSheetHeightRatio(0.88);
      else setSheetHeightRatio(0.78);
      return;
    }

    if (sh >= 0.78) {
      setSheetHeightRatio(0.72);
      return;
    }
    if (sh < 0.4) setSheetHeightRatio(0.48);
    else setSheetHeightRatio(0.52);
  }, [top.screen, goBack, goExploreRegion]);

  const [villePoints, setVillePoints] = useState<FeatureCollection | null>(null);
  const [editorialRoadLineFc, setEditorialRoadLineFc] = useState<FeatureCollection | null>(null);
  const [starItineraryStops, setStarItineraryStops] = useState<StarItineraryStopDto[]>([]);
  const [starRouteDetail, setStarRouteDetail] = useState<{
    regionId: string;
    slug: string;
    stops: StarItineraryStopDto[];
  } | null>(null);

  useEffect(() => {
    if (!activeRegionId || top.screen === "france" || top.screen === "region-preview") {
      setVillePoints(null);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set("regionId", activeRegionId);
    qs.set("zoom", String(debouncedMapZoom));
    qs.set("variant", "map");
    for (const a of ctx.ambiance) qs.append("ambiance", a);
    fetch(`/api/inspiration/lieux-region?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { lieux?: SlimLieuPoint[] }) => {
        if (cancelled || !Array.isArray(d.lieux)) return;
        const editorial = activeRegionId ? getRegionEditorial(activeRegionId) : undefined;
        const mustSlugs = new Set(
          (editorial?.trois_incontournables ?? []).map((n) => slugFromNom(n))
        );
        const savedSlugs = new Set(
          listFavorites()
            .filter((f) => f.kind === "place")
            .map((f) => f.refId)
        );
        const maxByZoom =
          debouncedMapZoom < 6.5 ? 7 : debouncedMapZoom < 7.5 ? 12 : debouncedMapZoom < 9 ? 24 : 42;
        const capped = d.lieux.slice(0, maxByZoom);
        const enriched: SlimLieuPoint[] = capped.map((l) => {
          const tier = savedSlugs.has(l.slug)
            ? ("saved" as const)
            : mustSlugs.has(l.slug)
              ? ("strong" as const)
              : ("standard" as const);
          return { ...l, tier };
        });
        setVillePoints(lieuxToPointCollection(enriched));
      })
      .catch(() => {
        if (!cancelled) setVillePoints(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, top.screen, ctx.ambiance, debouncedMapZoom]);

  const editorialSlugForRoadLine = useMemo(() => {
    if (!activeRegionId) return null;
    if (top.screen === "star-list") return starListPreviewLineSlug;
    if (top.screen === "star-detail" && top.kind === "editorial") return top.editorialSlug;
    return null;
  }, [activeRegionId, top, starListPreviewLineSlug]);

  useEffect(() => {
    if (!activeRegionId || !editorialSlugForRoadLine) {
      setEditorialRoadLineFc(null);
      setStarItineraryStops([]);
      setStarRouteDetail(null);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({
      regionId: activeRegionId,
      slug: editorialSlugForRoadLine,
    });
    fetch(`/api/inspiration/region-star-line?${qs.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as { line?: FeatureCollection; stops?: StarItineraryStopDto[] };
        if (cancelled) return;
        if (
          !r.ok ||
          !data?.line ||
          data.line.type !== "FeatureCollection" ||
          !data.line.features?.length
        ) {
          setEditorialRoadLineFc(null);
          setStarItineraryStops([]);
          setStarRouteDetail(null);
          return;
        }
        setEditorialRoadLineFc(data.line);
        const stops = Array.isArray(data.stops) ? data.stops : [];
        setStarItineraryStops(stops);
        setStarRouteDetail({
          regionId: activeRegionId,
          slug: editorialSlugForRoadLine,
          stops,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setEditorialRoadLineFc(null);
          setStarItineraryStops([]);
          setStarRouteDetail(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, editorialSlugForRoadLine]);

  const territoryPoints = useMemo(() => {
    const show =
      top.screen === "region-explore" ||
      top.screen === "region-map-fullscreen" ||
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
    if (top.screen === "region-map-fullscreen") {
      closeRegionMapFullscreen();
      return;
    }
    if (
      top.screen === "region-preview" ||
      top.screen === "region-explore" ||
      top.screen === "poi-detail" ||
      top.screen === "star-list" ||
      top.screen === "star-detail"
    ) {
      goBack();
    }
  }, [top.screen, goBack, closeRegionMapFullscreen]);

  const onMapBackgroundClear = useCallback(() => {
    setSelectedVillePreview(null);
    onMapBackgroundClick();
  }, [onMapBackgroundClick]);

  const onVilleClick = useCallback((slug: string, nom?: string) => {
    setSelectedVillePreview({ slug, nom: nom ?? slug });
  }, []);

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

    let editorialFeatures: Feature[] = [];
    if (editorialRoadLineFc?.features?.length) {
      if (top.screen === "star-list" && starListPreviewLineSlug) {
        editorialFeatures = editorialRoadLineFc.features;
      } else if (top.screen === "star-detail" && top.kind === "editorial" && hlEditorialSlug) {
        editorialFeatures = editorialRoadLineFc.features.map((f) => ({
          ...f,
          properties: {
            ...(typeof f.properties === "object" && f.properties !== null ? f.properties : {}),
            hl: 1,
          },
        }));
      }
    }

    const features = [...(legacyFc?.features ?? []), ...editorialFeatures];
    if (features.length === 0) {
      return { starLineFeatures: null, showStarLines: false };
    }
    return {
      starLineFeatures: { type: "FeatureCollection", features } as FeatureCollection,
      showStarLines: true,
    };
  }, [top, activeRegionId, editorialRoadLineFc, starListPreviewLineSlug]);

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
      const feat = editorialRoadLineFc?.features[0];
      const geom = feat?.geometry;
      if (geom && geom.type === "LineString") {
        mapRef.current.fitBounds(bboxFromLineString(geom as LineString));
      }
      return;
    }

    if (top.screen === "star-list" && starListPreviewLineSlug) {
      const feat = editorialRoadLineFc?.features[0];
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

    if (top.screen === "region-map-fullscreen" && activeRegionId) {
      const b = bboxForRegionFeature(sectorsFc, activeRegionId);
      if (!b) return;
      mapRef.current.fitBounds(b, {
        duration: 1000,
        afterLayout: false,
        padding: { top: 64, bottom: 64, left: 48, right: 48 },
      });
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
  }, [mapReady, top, sectorsFc, activeRegionId, editorialRoadLineFc, starListPreviewLineSlug]);

  const dimOtherRegions = top.screen !== "france";

  if (!mapboxAccessToken) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-courier text-sm text-[#2a211c]">
        Configure <code className="rounded bg-white px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> pour la
        carte.
      </p>
    );
  }

  const highlightTerritoryId =
    top.screen === "poi-detail" && "territoryId" in top ? top.territoryId : null;

  const mapBaseProps = {
    data: sectorsFc,
    outlineData: outlineFc,
    mapboxAccessToken,
    selectedRegionId: activeRegionId,
    dimOtherRegions,
    territoryPoints,
    territoryPointCount: territoryPoints?.features.length ?? 0,
    showTerritoryPoints: !!territoryPoints?.features.length,
    highlightTerritoryId,
    villePoints,
    villePointCount: villePoints?.features.length ?? 0,
    showVillePoints: !!villePoints?.features.length,
    starLineFeatures,
    showStarLines,
    starItineraryStops,
    showStarItineraryMarkers:
      starItineraryStops.length > 0 &&
      ((top.screen === "star-list" && !!starListPreviewLineSlug) ||
        (top.screen === "star-detail" && top.kind === "editorial")),
    onSelectRegion: selectRegion,
    onTerritoryPointClick: (tid: string) => selectTerritoryPoi(tid),
    onVilleClick,
    onMapBackgroundClick: onMapBackgroundClear,
    onMapReady,
    onZoomChange: setMapZoom,
    loading: loadState === "loading",
    loadError: loadState === "error",
    franceDiscoveryMuted: top.screen === "france",
  };

  const sheetHvh = `${Math.round(sheetHeightRatio * 100)}vh`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:rounded-2xl md:border md:border-white/8 md:shadow-lg">
      <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#fff4ec] to-[#fde8dc]">
        {/*
          Une seule instance carte = pas de remontage / pas de resize WebGL au changement France → région.
          La fiche est en overlay : la carte reste full-bleed, comme entre deux régions.
        */}
        <div className="relative isolate min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <InspirationMapClient ref={mapRef} {...mapBaseProps} />
          </div>

          {selectedVillePreview && activeRegionId && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[48] flex justify-center px-3 sm:justify-start sm:pl-5">
              <div className="pointer-events-auto flex w-full max-w-md gap-3 rounded-2xl border border-[#E07856]/35 bg-[#111111]/95 p-3 shadow-2xl backdrop-blur-md">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#1c1c1c]">
                  <CityPhoto
                    stepId={selectedVillePreview.slug}
                    ville={selectedVillePreview.nom}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    imageLoading="eager"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-courier text-sm font-bold leading-tight text-white">
                    {selectedVillePreview.nom}
                  </p>
                  <Link
                    href={withReturnTo(
                      `/inspirer/ville/${encodeURIComponent(selectedVillePreview.slug)}?from=inspiration`,
                      returnBase
                    )}
                    className="mt-1.5 inline-flex font-courier text-xs font-bold text-[#E07856] underline-offset-2 hover:underline"
                  >
                    Ouvrir la fiche
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedVillePreview(null)}
                    className="mt-2 block font-courier text-[10px] text-white/40 underline hover:text-white/60"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          {top.screen === "region-map-fullscreen" && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[42] flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={closeRegionMapFullscreen}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#E07856]/25 bg-white/95 px-4 py-2.5 font-courier text-sm font-bold text-[#E07856] shadow-lg backdrop-blur-md"
              >
                ← Retour à la fiche
              </button>
            </div>
          )}

          {(top.screen === "france" ||
            top.screen === "region-preview" ||
            top.screen === "region-explore") && (
              <>
                {top.screen === "france" && (
                  <div className="pointer-events-none absolute left-0 right-0 top-2 z-10 hidden justify-center px-3 lg:flex">
                    <p className="max-w-md rounded-full border border-[#E07856]/15 bg-white/95 px-3 py-1.5 text-center font-courier text-[10px] leading-snug text-[#2a211c]/85 shadow-sm backdrop-blur-sm">
                      Vue France — touche une région sur la carte ou fais défiler les cartes en bas
                    </p>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute left-0 right-0 z-[44]"
                  style={{
                    bottom: showRegionSheet ? sheetHvh : 0,
                  }}
                >
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
              className="absolute bottom-0 left-0 right-0 z-[45] flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl border border-[#E07856]/20 bg-gradient-to-t from-[#faf0e8] to-[#fff8f2] shadow-[0_-8px_40px_rgba(180,80,40,0.2)]"
              style={{ height: sheetHvh }}
            >
              <RegionSplitGutter
                onDragStart={onSheetHandleDragStart}
                onDrag={onSheetHandleDrag}
                onDragEnd={onGutterDragEnd}
              />
              <div className="min-h-0 flex-1 overflow-hidden">
                <MapBottomPanels starRouteDetail={starRouteDetail} />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
