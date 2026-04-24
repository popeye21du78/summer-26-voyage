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
  thinLieuPointsByMinSeparation,
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
import { villePointLimitForZoom } from "@/lib/inspiration-lieux-ambiance";
import PlaceAffinityActions from "./PlaceAffinityActions";

const MAP_REGIONS_GEO_URL = "/geo/inspiration-map-regions.geojson";
const MAP_REGIONS_OUTLINE_URL = "/geo/inspiration-map-regions-outline.geojson";

type Props = { mapboxAccessToken: string | undefined };

/**
 * Poignée unique de la sheet région.
 * Intégrée dans la sheet (pas de bande séparée au-dessus), ne laisse qu'un petit
 * pill gris visible. Gère pointer + touch pour les 3 snap points (fermé / aperçu / plein).
 */
function RegionSheetHandle({
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
      aria-label="Redimensionner la fiche région"
      className="relative z-30 flex min-h-[32px] shrink-0 cursor-row-resize touch-none select-none items-center justify-center px-6"
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
      <div className="pointer-events-none h-1 w-14 rounded-full bg-black/55 shadow-[0_4px_14px_rgba(0,0,0,0.55)] ring-1 ring-black/35" />
    </div>
  );
}

/**
 * Menu "trois points" qui remplace la barre de recherche en vue France de la carte.
 * Compact, en haut-droite, affiche les actions rapides (légende, aide, filtres).
 * Ouvre un petit menu contextuel en fond verre — se ferme au clic extérieur.
 */
function MapFranceMoreMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute right-3 top-[max(0.6rem,env(safe-area-inset-top))] z-[46] flex flex-col items-end gap-1.5"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Plus d'options"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-accent-start)]/35 bg-[var(--color-bg-main)]/85 shadow-md backdrop-blur-md transition active:scale-[0.96]"
      >
        <span className="sr-only">Plus d'options</span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none">
          <circle cx="5" cy="12" r="1.8" fill="currentColor" className="text-[var(--color-accent-start)]" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" className="text-[var(--color-accent-start)]" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" className="text-[var(--color-accent-start)]" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="pointer-events-auto w-48 overflow-hidden rounded-2xl border border-[var(--color-accent-start)]/25 bg-[var(--color-bg-main)]/92 shadow-xl backdrop-blur-xl"
        >
          <Link
            href="/inspirer?tab=stars"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 font-courier text-[12px] text-[var(--color-text-primary)]/90 transition hover:bg-[var(--color-accent-start)]/10"
          >
            Itinéraires stars
          </Link>
          <Link
            href="/inspirer?tab=amis"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 font-courier text-[12px] text-[var(--color-text-primary)]/90 transition hover:bg-[var(--color-accent-start)]/10"
          >
            Voyages d'amis
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2 text-left font-courier text-[12px] text-[var(--color-text-primary)]/90 transition hover:bg-[var(--color-accent-start)]/10"
          >
            Légende de la carte
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InspirationMapScreen({ mapboxAccessToken }: Props) {
  const ctx = useInspirationMap();
  const {
    top,
    selectTerritoryPoi,
    goBack,
    resetFrance,
    closeRegionMapFullscreen,
    selectRegion,
    starListPreviewLineSlug,
  } = ctx;
  const returnBase = useReturnBase();

  const mapRef = useRef<InspirationMapExpose>(null);
  /** Hauteur de la fiche en fraction de la fenêtre (overlay — la carte ne redimensionne jamais). */
  const sheetDragStartRatio = useRef(0.52);
  const [sheetHeightRatio, setSheetHeightRatio] = useState(0.32);
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
    const loadId = requestAnimationFrame(() => {
      if (!cancelled) setLoadState("loading");
    });
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
      cancelAnimationFrame(loadId);
    };
  }, []);

  const activeRegionId =
    top.screen !== "france" && "regionId" in top ? top.regionId : null;

  useEffect(() => {
    const id = requestAnimationFrame(() => setSelectedVillePreview(null));
    return () => cancelAnimationFrame(id);
  }, [activeRegionId, top.screen]);

  const showRegionSheet =
    top.screen !== "france" && top.screen !== "region-map-fullscreen";

  /**
   * Sheet région : 3 snap points fixes.
   * - CLOSED (< 0.12) : la sheet est fermée → goBack() → carte + carousel visibles seuls.
   * - PREVIEW (~0.34) : au clic, la fiche ne couvre qu'environ un tiers d'écran.
   * - FULL (~0.86)    : aimanté juste sous la top bar → page région complète scrollable.
   * Tirer vers le bas depuis FULL descend à PREVIEW ; tirer encore vers le bas ferme.
   */
  const SNAP_PREVIEW = 0.32;
  /**
   * Plein écran = 100 % du viewport. L'user veut que la fiche région
   * recouvre complètement la top nav quand on la tire jusqu'en haut
   * (sinon on ne peut pas "la rabaisser" car la poignée est masquée).
   * Le z-index CSS est déjà ≥ celui de la top nav.
   */
  const SNAP_FULL = 1.0;
  const SNAP_DEFAULT_DETAIL = 0.58;

  useEffect(() => {
    const nextRatio =
      top.screen === "france"
        ? SNAP_PREVIEW
        : top.screen === "region-map-fullscreen"
          ? null
          : top.screen === "region-preview"
            ? SNAP_PREVIEW
            : top.screen === "region-explore"
              ? SNAP_FULL
              : SNAP_DEFAULT_DETAIL;
    if (nextRatio == null) return;
    requestAnimationFrame(() => setSheetHeightRatio(nextRatio));
  }, [top.screen]);

  const onSheetHandleDragStart = useCallback(() => {
    sheetDragStartRatio.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  /** Tirer vers le bas (offset positif) = sheet plus courte ; vers le haut = sheet plus haute. */
  const onSheetHandleDrag = useCallback(
    (offsetY: number) => {
      const h = typeof window !== "undefined" ? window.innerHeight : 800;
      const next = sheetDragStartRatio.current - offsetY / h;
      setSheetHeightRatio(Math.min(1, Math.max(0.06, next)));
    },
    []
  );

  const sheetHeightRatioRef = useRef(sheetHeightRatio);
  useEffect(() => {
    sheetHeightRatioRef.current = sheetHeightRatio;
  }, [sheetHeightRatio]);

  const onGutterDragEnd = useCallback(() => {
    const sh = sheetHeightRatioRef.current;
    const mode = top.screen;

    if (mode === "region-map-fullscreen") return;

    /** 3 snap points : fermé / aperçu / plein. Choix du plus proche avec seuils asymétriques. */
    if (mode === "region-preview" || mode === "region-explore") {
      if (sh < 0.2) {
        goBack();
        return;
      }
      /** Point milieu entre PREVIEW (~0.34) et FULL (~0.86). */
      if (sh < 0.62) {
        setSheetHeightRatio(SNAP_PREVIEW);
      } else {
        setSheetHeightRatio(SNAP_FULL);
      }
      return;
    }

    /** POI, stars, etc. conservent l'ancien comportement 2 snaps. */
    if (sh <= 0.28) {
      goBack();
      return;
    }
    if (sh >= 0.74) {
      setSheetHeightRatio(SNAP_DEFAULT_DETAIL);
      return;
    }
    if (sh < 0.42) setSheetHeightRatio(SNAP_PREVIEW);
    else setSheetHeightRatio(SNAP_DEFAULT_DETAIL);
  }, [top.screen, goBack]);

  const [villePoints, setVillePoints] = useState<FeatureCollection | null>(null);
  const [editorialRoadLineFc, setEditorialRoadLineFc] = useState<FeatureCollection | null>(null);
  const [starItineraryStops, setStarItineraryStops] = useState<StarItineraryStopDto[]>([]);
  const [starRouteDetail, setStarRouteDetail] = useState<{
    regionId: string;
    slug: string;
    stops: StarItineraryStopDto[];
  } | null>(null);

  useEffect(() => {
    /**
     * POIs visibles DÈS qu'une région est sélectionnée (aperçu, plein ou fullscreen).
     * Seule la vue « france » pure est vide (les cartes régions suffisent).
     */
    if (!activeRegionId || top.screen === "france") {
      requestAnimationFrame(() => setVillePoints(null));
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set("regionId", activeRegionId);
    qs.set("zoom", String(debouncedMapZoom));
    qs.set("variant", "map");
    for (const a of ctx.ambiance) qs.append("ambiance", a);
    for (const poiType of ctx.poiTypes) qs.append("poiType", poiType);
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
        const enriched: SlimLieuPoint[] = d.lieux.map((l) => {
          const tier = savedSlugs.has(l.slug)
            ? ("saved" as const)
            : mustSlugs.has(l.slug)
              ? ("strong" as const)
              : ("standard" as const);
          return { ...l, tier };
        });
        const limit = villePointLimitForZoom(debouncedMapZoom);
        /** Écart mini (km) entre marqueurs : limite les piles à 2 niveaux visuels au plus. */
        const minKm = Math.max(3.2, 24.5 - debouncedMapZoom * 1.5);
        const thinned = thinLieuPointsByMinSeparation(enriched, limit, minKm);
        setVillePoints(lieuxToPointCollection(thinned));
      })
      .catch(() => {
        if (!cancelled) setVillePoints(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, top.screen, ctx.ambiance, ctx.poiTypes, debouncedMapZoom]);

  const editorialSlugForRoadLine = useMemo(() => {
    if (!activeRegionId) return null;
    if (top.screen === "star-list") return starListPreviewLineSlug;
    if (top.screen === "star-detail" && top.kind === "editorial") return top.editorialSlug;
    return null;
  }, [activeRegionId, top, starListPreviewLineSlug]);

  useEffect(() => {
    if (!activeRegionId || !editorialSlugForRoadLine) {
      const clearId = requestAnimationFrame(() => {
        setEditorialRoadLineFc(null);
        setStarItineraryStops([]);
        setStarRouteDetail(null);
      });
      return () => cancelAnimationFrame(clearId);
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
      activeRegionId,
      ctx.poiTypes
    );
    return territoriesToPointCollection(list, null);
  }, [top.screen, activeRegionId, all, ctx.ambiance, ctx.duration, ctx.poiTypes]);

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
        {/*
         * Pas d'`isolate` ici : on veut que la sheet région (z-[180]) puisse
         * passer AU-DESSUS de la top nav (`.viago-top-tabs-wrap` = z 120)
         * quand on la tire en plein écran. `isolation: isolate` créerait
         * un stacking context local et la sheet serait emprisonnée dessous,
         * ce qui reproduisait exactement le bug signalé par l'user
         * (« la barre du haut passe encore devant la région »).
         */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <InspirationMapClient ref={mapRef} {...mapBaseProps} />
          </div>

          {selectedVillePreview && activeRegionId && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[48] flex justify-center px-3 sm:justify-start sm:pl-5">
              <div className="pointer-events-auto flex w-full max-w-md gap-3 rounded-2xl border border-[var(--color-accent-start)]/35 bg-[var(--color-bg-main)]/95 p-3 shadow-2xl backdrop-blur-md">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[var(--color-bg-secondary)]">
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
                  <PlaceAffinityActions
                    placeSlug={selectedVillePreview.slug}
                    placeLabel={selectedVillePreview.nom}
                    compact
                  />
                  <Link
                    href={withReturnTo(
                      `/inspirer/ville/${encodeURIComponent(selectedVillePreview.slug)}?from=inspiration`,
                      returnBase
                    )}
                    className="mt-1.5 inline-flex font-courier text-xs font-bold text-[var(--color-accent-start)] underline-offset-2 hover:underline"
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
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-start)]/25 bg-white/95 px-4 py-2.5 font-courier text-sm font-bold text-[var(--color-accent-start)] shadow-lg backdrop-blur-md"
              >
                ← Retour à la fiche
              </button>
            </div>
          )}

          {top.screen === "france" && (
            <>
              <div className="pointer-events-none absolute left-0 right-0 top-2 z-10 hidden justify-center px-3 lg:flex">
                <p className="max-w-md rounded-full border border-[var(--color-accent-start)]/15 bg-white/95 px-3 py-1.5 text-center font-courier text-[10px] leading-snug text-[#2a211c]/85 shadow-sm backdrop-blur-sm">
                  Vue France — touche une région sur la carte ou fais défiler les cartes en bas
                </p>
              </div>
              {/**
               * Menu trois-points (vue France uniquement) : remplace la barre de
               * recherche volumineuse par un point d'accès compact (filtres/légende/aide).
               * Discret, en haut-droite de la carte, par-dessus la top nav glass.
               */}
              <MapFranceMoreMenu />
              {/**
               * Carousel régions : visible UNIQUEMENT en vue France.
               * Dès qu'une région est sélectionnée (sheet ouverte à n'importe quel snap), on le cache
               * pour que la sheet ne soit plus cachée par les cartes, et que la carte derrière reste lisible.
               */}
              <div
                className="pointer-events-none absolute left-0 right-0 bottom-0 z-[44]"
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
              /**
               * z-index mobile porté à 180 : largement au-dessus de la top nav
               * (`.viago-top-tabs-wrap` = 120) ET sous la bottom nav (= 200),
               * de sorte que :
               *   - la POIGNÉE de drag n'est JAMAIS cachée derrière la top nav
               *     → l'user peut toujours retirer la sheet vers le bas.
               *   - le contenu de la sheet passe toujours VISUELLEMENT derrière
               *     la bottom nav (qui reste prioritaire à 200).
               * Sur desktop, la top nav ne chevauche pas le conteneur carte,
               * donc 45 suffit.
               */
              className="flex max-h-[min(100vh,100dvh)] flex-col overflow-hidden rounded-t-3xl border border-[var(--color-accent-start)]/30 bg-transparent shadow-[0_-28px_56px_rgba(0,0,0,0.42)] max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-[180] md:absolute md:bottom-0 md:left-0 md:right-0 md:z-[45]"
              style={{
                height: sheetHvh,
                maxHeight: "min(100vh, 100dvh)",
                /**
                 * Plus de paddingBottom : la fiche descend désormais jusqu'en bas
                 * de l'écran et passe VISUELLEMENT derrière la bottom nav. Le dégradé
                 * bas (plus bas dans le JSX, h = 5.8rem) crée le fondu et le padding
                 * du scroller interne (MapBottomPanels) évite que le contenu soit
                 * coincé sous la nav.
                 */
              }}
            >
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-t-3xl bg-[var(--color-bg-main)]">
                <MapBottomPanels starRouteDetail={starRouteDetail} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[40] h-[calc(5.8rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-[var(--color-bg-main)] via-[var(--color-bg-main)]/85 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-11 items-start justify-center bg-gradient-to-b from-black/45 via-black/15 to-transparent pt-2.5">
                  <div className="pointer-events-auto w-full max-w-[100vw] px-4">
                    <RegionSheetHandle
                      onDragStart={onSheetHandleDragStart}
                      onDrag={onSheetHandleDrag}
                      onDragEnd={onGutterDragEnd}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {showRegionSheet && (
            <div className="pointer-events-none fixed inset-x-0 top-[max(0.6rem,env(safe-area-inset-top))] z-[190] flex justify-end px-3">
              <button
                type="button"
                onClick={resetFrance}
                className="pointer-events-auto rounded-full border border-[var(--color-accent-start)]/35 bg-[var(--color-bg-main)]/88 px-3 py-1.5 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)] shadow-lg backdrop-blur-md"
              >
                Fermer la fiche
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
