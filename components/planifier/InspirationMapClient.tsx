"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { Feature, FeatureCollection } from "geojson";
import type { MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import type { TerritoriesFeatureCollection } from "@/lib/editorial-territories";
import { stripInspirationBasemapClutter } from "@/lib/mapbox-strip-inspiration-basemap";
import type { StarItineraryStopDto } from "@/types/inspiration-star-map";
import {
  Building2,
  Home,
  Landmark,
  MapPin,
  Mountain,
  Trees,
  Waves,
} from "lucide-react";
import { Marker } from "react-map-gl/mapbox";

const Map = dynamic(() => import("react-map-gl/mapbox").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[240px] items-center justify-center bg-[#1c1c1c]/40 font-courier text-sm text-white/80/60">
      Chargement carte…
    </div>
  ),
});
const Source = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Source), {
  ssr: false,
});
const Layer = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Layer), {
  ssr: false,
});

export const FILL_LAYER_ID = "insp-territories-fill";
export const LINE_LAYER_ID = "insp-territories-outline";
export const POI_LAYER_ID = "insp-territory-points";
export const VILLE_LAYER_ID = "insp-ville-points";
export const STAR_LINE_LAYER_ID = "insp-star-lines";

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

function StopIconPicto({ iconKey }: { iconKey: string }) {
  const c = "h-5 w-5 text-white";
  switch (iconKey) {
    case "ville":
      return <Building2 className={c} />;
    case "village":
      return <Home className={c} />;
    case "plage":
      return <Waves className={c} />;
    case "patrimoine":
      return <Landmark className={c} />;
    case "rando":
      return <Mountain className={c} />;
    case "nature":
      return <Trees className={c} />;
    default:
      return <MapPin className={c} />;
  }
}

const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41],
  [9.5, 51.5],
];

const DEFAULT_VIEW = { longitude: 2.5, latitude: 46.5, zoom: 5.2 };

function allInteractiveLayerIds(): string[] {
  return [
    FILL_LAYER_ID,
    LINE_LAYER_ID,
    POI_LAYER_ID,
    VILLE_LAYER_ID,
    STAR_LINE_LAYER_ID,
  ];
}

export type FitBoundsOptions = {
  /** Après passage carte plein écran → split : resize sur 2 frames puis zoom (sans délai arbitraire). */
  afterLayout?: boolean;
  duration?: number;
  /** Padding dans le viewport Mapbox (px). */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Appelé une fois le mouvement de caméra terminé (moveend). */
  onComplete?: () => void;
};

export type InspirationMapExpose = {
  fitBounds: (bbox: [number, number, number, number], options?: FitBoundsOptions) => void;
  fitFranceOverview: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  /** Interrompt vol / ease en cours (ex. changement de région pendant l’intro). */
  stopCamera: () => void;
};

type InspirationMapClientProps = {
  data: TerritoriesFeatureCollection | null;
  outlineData: FeatureCollection | null;
  mapboxAccessToken: string;
  selectedRegionId: string | null;
  dimOtherRegions: boolean;
  territoryPoints: FeatureCollection | null;
  territoryPointCount?: number;
  showTerritoryPoints: boolean;
  villePoints: FeatureCollection | null;
  villePointCount?: number;
  showVillePoints: boolean;
  starLineFeatures: FeatureCollection | null;
  showStarLines: boolean;
  starItineraryStops?: StarItineraryStopDto[];
  showStarItineraryMarkers?: boolean;
  onSelectRegion: (id: string) => void;
  onTerritoryPointClick?: (territoryId: string) => void;
  onVilleClick?: (slug: string) => void;
  /** Clic sur la carte sans feature (eau / vide / hors couche). */
  onMapBackgroundClick?: () => void;
  onMapReady?: () => void;
  /** Zoom courant (région / densité des POI). */
  onZoomChange?: (zoom: number) => void;
  loading?: boolean;
  loadError?: boolean;
  /** Opacité des POI territoire (0–1), pour apparition en fondu après la fiche. */
  territoryPoiOpacity?: number;
  /** Carte France en mode repérage : désature légèrement le rendu (couches + fond). */
  franceDiscoveryMuted?: boolean;
  /** POI territoire mis en avant (fiche ouverte). */
  highlightTerritoryId?: string | null;
};

const InspirationMapClient = forwardRef<InspirationMapExpose, InspirationMapClientProps>(
  function InspirationMapClient(
    {
      data,
      outlineData,
      mapboxAccessToken,
      selectedRegionId,
      dimOtherRegions,
      territoryPoints,
      territoryPointCount = 0,
      showTerritoryPoints,
      villePoints,
      villePointCount = 0,
      showVillePoints,
      starLineFeatures,
      showStarLines,
      starItineraryStops = [],
      showStarItineraryMarkers = false,
      onSelectRegion,
      onTerritoryPointClick,
      onVilleClick,
      onMapBackgroundClick,
      onMapReady,
      onZoomChange,
      loading = false,
      loadError = false,
      territoryPoiOpacity = 1,
      franceDiscoveryMuted = false,
      highlightTerritoryId = null,
    },
    ref
  ) {
    const mapRef = useRef<MapRef>(null);
    const onRegionRef = useRef(onSelectRegion);
    onRegionRef.current = onSelectRegion;
    const onPoiRef = useRef(onTerritoryPointClick);
    onPoiRef.current = onTerritoryPointClick;
    const onVilleRef = useRef(onVilleClick);
    onVilleRef.current = onVilleClick;
    const onBgRef = useRef(onMapBackgroundClick);
    onBgRef.current = onMapBackgroundClick;
    const onZoomRef = useRef(onZoomChange);
    onZoomRef.current = onZoomChange;

    const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);

    const none = "__none__";
    const sel = selectedRegionId ?? none;

    /** Centroid longitude pour dégradé ouest → est (remplissages). */
    const regionsDataAugmented = useMemo(() => {
      if (!data?.features?.length) return null;
      return {
        ...data,
        features: data.features.map((f) => {
          try {
            const c = turf.centroid(f as Feature);
            const coords = c.geometry.type === "Point" ? c.geometry.coordinates : null;
            const lng = coords != null && coords.length >= 2 ? coords[0] : NaN;
            return {
              ...f,
              properties: {
                ...f.properties,
                center_lng: Number.isFinite(lng) ? lng : 2.5,
              },
            };
          } catch {
            return {
              ...f,
              properties: { ...f.properties, center_lng: 2.5 },
            };
          }
        }),
      } as TerritoriesFeatureCollection;
    }, [data]);

    const applyBasemapStrip = useCallback((map: MapboxMap) => {
      stripInspirationBasemapClutter(map, allInteractiveLayerIds());
    }, []);

    /** Remplissages : vague corail / sable selon la longitude (comme un dégradé est→ouest). */
    const fillPaint = useMemo(
      () =>
        ({
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "center_lng"],
            -5.5,
            "#E8B090",
            0,
            "#E07856",
            4,
            "#E8906E",
            9.5,
            "#D4A574",
          ],
          "fill-opacity": dimOtherRegions
            ? [
                "case",
                ["==", ["get", "id"], sel],
                0.44,
                0.14,
              ]
            : [
                "case",
                ["==", ["get", "id"], sel],
                0.4,
                0.26,
              ],
        }) as Record<string, unknown>,
      [sel, dimOtherRegions]
    );

    /** Toutes les frontières région : même couleur terracotta (lisibilité + cohérence). */
    const linePaint = useMemo(
      () =>
        ({
          "line-color": "#E07856",
          "line-width": [
            "case",
            ["==", ["get", "id"], sel],
            5,
            3,
          ],
          "line-opacity": 0.94,
          "line-blur": 0.12,
        }) as Record<string, unknown>,
      [sel]
    );

    const starLinePaint = useMemo(
      () =>
        ({
          "line-color": "#E07856",
          "line-width": ["case", ["==", ["get", "hl"], 1], 5, 2.2],
          "line-opacity": 0.88,
        }) as Record<string, unknown>,
      []
    );

    const territoryPoiPaint = useMemo(() => {
      const op = territoryPoiOpacity;
      const hl = highlightTerritoryId;
      if (!hl) {
        return {
          "circle-radius": 7,
          "circle-color": "#E07856",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": op,
          "circle-stroke-opacity": op,
        } as Record<string, unknown>;
      }
      return {
        "circle-radius": ["case", ["==", ["get", "id"], hl], 16, 7],
        "circle-color": [
          "case",
          ["==", ["get", "id"], hl],
          "#ff8a5c",
          "#E07856",
        ],
        "circle-stroke-width": ["case", ["==", ["get", "id"], hl], 4, 2],
        "circle-stroke-color": "#fffef8",
        "circle-opacity": op,
        "circle-stroke-opacity": op,
      } as Record<string, unknown>;
    }, [territoryPoiOpacity, highlightTerritoryId]);

    useImperativeHandle(
      ref,
      () => ({
        fitBounds: (bbox, options) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          const duration = options?.duration ?? 950;
          const basePad = { top: 40, bottom: 40, left: 44, right: 44 };
          const padding = { ...basePad, ...options?.padding };
          const bounds: [[number, number], [number, number]] = [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ];
          const runFit = () => {
            map.fitBounds(bounds, {
              padding,
              duration,
              maxZoom: 8.4,
              essential: true,
            });
            const done = options?.onComplete;
            if (done) {
              if (duration <= 0) {
                map.once("idle", done);
              } else {
                map.once("moveend", done);
              }
            }
          };
          if (options?.afterLayout) {
            requestAnimationFrame(() => {
              map.resize();
              requestAnimationFrame(() => {
                map.resize();
                runFit();
              });
            });
          } else {
            map.resize();
            runFit();
          }
        },
        fitFranceOverview: () => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          map.fitBounds(FRANCE_BOUNDS, { padding: 48, duration: 900, maxZoom: 6 });
        },
        flyTo: (lng, lat, zoom = 8) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          map.easeTo({
            center: [lng, lat],
            zoom,
            duration: 1050,
            essential: true,
          });
        },
        stopCamera: () => {
          try {
            mapRef.current?.getMap()?.stop();
          } catch {
            /* ignore */
          }
        },
      }),
      []
    );

    useEffect(() => {
      if (!regionsDataAugmented) setMapInstance(null);
    }, [regionsDataAugmented]);

    useEffect(() => {
      if (!regionsDataAugmented || !mapInstance) return;

      const layersPresent = (): string[] =>
        allInteractiveLayerIds().filter((id) => {
          try {
            return !!mapInstance.getLayer(id);
          } catch {
            return false;
          }
        });

      const onMapClick = (e: MapMouseEvent) => {
        const layers = layersPresent();
        if (layers.length === 0) return;
        const feats = mapInstance.queryRenderedFeatures(e.point, { layers });
        if (feats.length === 0) {
          onBgRef.current?.();
          return;
        }
        const topF = feats[0];
        const lid = topF.layer?.id;
        const props = topF.properties as Record<string, unknown> | null;
        if (!props) return;
        if (lid === FILL_LAYER_ID && typeof props.id === "string") {
          onRegionRef.current(props.id);
          return;
        }
        if (lid === POI_LAYER_ID && typeof props.id === "string") {
          onPoiRef.current?.(props.id);
          return;
        }
        if (lid === VILLE_LAYER_ID && typeof props.id === "string") {
          onVilleRef.current?.(props.id);
        }
      };

      const onMouseMove = (e: MapMouseEvent) => {
        const layers = layersPresent();
        if (!layers.length) return;
        const feats = mapInstance.queryRenderedFeatures(e.point, { layers });
        mapInstance.getCanvas().style.cursor = feats.length > 0 ? "pointer" : "";
      };

      mapInstance.on("click", onMapClick);
      mapInstance.on("mousemove", onMouseMove);
      return () => {
        mapInstance.off("click", onMapClick);
        mapInstance.off("mousemove", onMouseMove);
      };
    }, [
      regionsDataAugmented,
      mapInstance,
      showTerritoryPoints,
      territoryPointCount,
      showVillePoints,
      villePointCount,
      showStarLines,
    ]);

    useEffect(() => {
      if (!mapInstance) return;
      const run = () => applyBasemapStrip(mapInstance);
      mapInstance.on("styledata", run);
      mapInstance.once("idle", run);
      run();
      return () => {
        mapInstance.off("styledata", run);
      };
    }, [mapInstance, applyBasemapStrip]);

    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!mapInstance || !containerRef.current) return;
      const el = containerRef.current;
      const ro = new ResizeObserver(() => {
        mapInstance.resize();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [mapInstance]);

    return (
      <div
        ref={containerRef}
        className={`relative h-full min-h-[240px] w-full overflow-hidden transition-[filter] duration-300 ${
          franceDiscoveryMuted ? "grayscale-[0.45] contrast-[1.06] brightness-[1.02]" : ""
        }`}
      >
        {regionsDataAugmented && (
          <Map
            ref={mapRef}
            mapboxAccessToken={mapboxAccessToken}
            initialViewState={DEFAULT_VIEW}
            minZoom={4.5}
            maxZoom={11}
            maxBounds={FRANCE_BOUNDS}
            mapStyle={MAP_STYLE}
            style={{ width: "100%", height: "100%" }}
            attributionControl={false}
            onLoad={(e) => {
              setMapInstance(e.target);
              onMapReady?.();
              onZoomRef.current?.(e.target.getZoom());
            }}
            onMoveEnd={(e) => {
              onZoomRef.current?.(e.viewState.zoom);
            }}
          >
            <Source id="insp-territories" type="geojson" data={regionsDataAugmented}>
              <Layer id={FILL_LAYER_ID} type="fill" paint={fillPaint} />
            </Source>
            {outlineData && outlineData.features.length > 0 && (
              <Source id="insp-territories-outline" type="geojson" data={outlineData}>
                <Layer
                  id={LINE_LAYER_ID}
                  type="line"
                  paint={linePaint}
                  layout={{ "line-join": "round", "line-cap": "round" }}
                />
              </Source>
            )}
            {showStarLines && starLineFeatures && starLineFeatures.features.length > 0 && (
              <Source id="insp-star-lines" type="geojson" data={starLineFeatures}>
                <Layer
                  id={STAR_LINE_LAYER_ID}
                  type="line"
                  paint={starLinePaint}
                  layout={{ "line-join": "round", "line-cap": "round" }}
                />
              </Source>
            )}
            {showTerritoryPoints && territoryPoints && territoryPoints.features.length > 0 && (
              <Source id="insp-territory-pts" type="geojson" data={territoryPoints}>
                <Layer id={POI_LAYER_ID} type="circle" paint={territoryPoiPaint} />
              </Source>
            )}
            {showVillePoints && villePoints && villePoints.features.length > 0 && (
              <Source id="insp-ville-pts" type="geojson" data={villePoints}>
                <Layer
                  id={VILLE_LAYER_ID}
                  type="circle"
                  paint={{
                    "circle-radius": [
                      "match",
                      ["get", "tier"],
                      "strong",
                      12,
                      "saved",
                      10,
                      6,
                    ],
                    "circle-color": [
                      "match",
                      ["get", "tier"],
                      "strong",
                      "#E07856",
                      "saved",
                      "#E07856",
                      "#3d6b63",
                    ],
                    "circle-stroke-width": [
                      "match",
                      ["get", "tier"],
                      "strong",
                      3,
                      "saved",
                      2,
                      2,
                    ],
                    "circle-stroke-color": "#1c1c1c",
                  }}
                />
              </Source>
            )}
            {showStarItineraryMarkers &&
              starItineraryStops.map((s) => (
                <Marker
                  key={`${s.slug}-${s.order}`}
                  longitude={s.lng}
                  latitude={s.lat}
                  anchor="center"
                >
                  <button
                    type="button"
                    className="group relative flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-white shadow-lg ring-2 ring-[#E07856]/35 transition hover:scale-105 hover:ring-[#E07856]/55"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVilleClick?.(s.slug);
                    }}
                    aria-label={s.nom}
                  >
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URLs dynamiques Commons / Unsplash
                      <img
                        src={s.photoUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#E07856]">
                        <StopIconPicto iconKey={s.iconKey} />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#E07856] px-1 font-courier text-[10px] font-bold text-white shadow">
                      {s.order}
                    </span>
                    <span className="pointer-events-none absolute -top-7 left-1/2 max-w-[140px] -translate-x-1/2 rounded bg-[#111111]/88 px-1.5 py-0.5 text-center font-courier text-[9px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100">
                      {s.nom}
                    </span>
                  </button>
                </Marker>
              ))}
          </Map>
        )}
        {(loading || loadError || !regionsDataAugmented) && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center font-courier text-sm ${
              regionsDataAugmented ? "bg-white/70" : "bg-[#1c1c1c]/50"
            } text-white/80/70`}
          >
            {loadError
              ? "Impossible de charger les régions."
              : "Chargement des régions…"}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-white/85 px-2 py-1 font-courier text-[10px] text-white/80/60">
          © Mapbox © OpenStreetMap
        </div>
      </div>
    );
  }
);

export default InspirationMapClient;
