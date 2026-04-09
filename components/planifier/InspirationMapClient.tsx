"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { FeatureCollection } from "geojson";
import type { MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TerritoriesFeatureCollection } from "@/lib/editorial-territories";
import { stripInspirationBasemapClutter } from "@/lib/mapbox-strip-inspiration-basemap";
import { VOYAGE_UI } from "@/lib/voyage-map-palette";

const Map = dynamic(() => import("react-map-gl/mapbox").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg bg-[#FFF2EB]/50 font-courier text-sm text-[#333]/60">
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
const Popup = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Popup), {
  ssr: false,
});

const FILL_LAYER_ID = "insp-territories-fill";
const LINE_LAYER_ID = "insp-territories-outline";

/** Fond beige / sobre ; routes et labels sont masqués au chargement (voir strip). */
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

const PROTECTED_LAYERS = [FILL_LAYER_ID, LINE_LAYER_ID] as const;

const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41],
  [9.5, 51.5],
];

const DEFAULT_VIEW = { longitude: 2.5, latitude: 46.5, zoom: 5.2 };

type PopupState = { lng: number; lat: number; id: string; name: string };

type InspirationMapClientProps = {
  data: TerritoriesFeatureCollection | null;
  /** Contours régionaux (LineString / MultiLineString), générés au build. */
  outlineData: FeatureCollection | null;
  mapboxAccessToken: string;
  selectedId: string | null;
  onSelectTerritory: (id: string) => void;
  loading?: boolean;
  loadError?: boolean;
};

export default function InspirationMapClient({
  data,
  outlineData,
  mapboxAccessToken,
  selectedId,
  onSelectTerritory,
  loading = false,
  loadError = false,
}: InspirationMapClientProps) {
  const mapRef = useRef<MapRef>(null);
  const onSelectRef = useRef(onSelectTerritory);
  onSelectRef.current = onSelectTerritory;

  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const none = "__none__";
  const sel = selectedId ?? none;

  const applyBasemapStrip = useCallback((map: MapboxMap) => {
    stripInspirationBasemapClutter(map, [...PROTECTED_LAYERS]);
  }, []);

  const fillPaint = useMemo(
    () =>
      ({
        "fill-color": ["coalesce", ["get", "color"], VOYAGE_UI.coral],
        "fill-opacity": [
          "case",
          ["==", ["get", "id"], sel],
          0.4,
          0.26,
        ],
      }) as Record<string, unknown>,
    [sel]
  );

  const linePaint = useMemo(
    () =>
      ({
        "line-color": [
          "case",
          ["==", ["get", "id"], sel],
          VOYAGE_UI.terracotta,
          ["coalesce", ["get", "borderColor"], VOYAGE_UI.coral],
        ],
        "line-width": [
          "case",
          ["==", ["get", "id"], sel],
          5,
          3.5,
        ],
        "line-opacity": 0.95,
        "line-blur": 0.2,
      }) as Record<string, unknown>,
    [sel]
  );

  useEffect(() => {
    if (!data) setMapInstance(null);
  }, [data]);

  useEffect(() => {
    if (!data || !mapInstance) return;

    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const props = f?.properties as Record<string, unknown> | undefined;
      const id = props?.id;
      if (typeof id !== "string") return;
      onSelectRef.current(id);
      setPopup({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        id,
        name: String(props?.name ?? id),
      });
    };
    const onEnter = () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      mapInstance.getCanvas().style.cursor = "";
    };

    let attached = false;
    const tryAttach = () => {
      if (attached || !mapInstance.getLayer(FILL_LAYER_ID)) return;
      attached = true;
      mapInstance.on("click", FILL_LAYER_ID, onClick);
      mapInstance.on("mouseenter", FILL_LAYER_ID, onEnter);
      mapInstance.on("mouseleave", FILL_LAYER_ID, onLeave);
    };

    mapInstance.on("idle", tryAttach);
    tryAttach();

    return () => {
      mapInstance.off("idle", tryAttach);
      if (attached) {
        mapInstance.off("click", FILL_LAYER_ID, onClick);
        mapInstance.off("mouseenter", FILL_LAYER_ID, onEnter);
        mapInstance.off("mouseleave", FILL_LAYER_ID, onLeave);
      }
    };
  }, [data, mapInstance]);

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

  return (
    <div className="relative h-[min(55vh,420px)] w-full min-h-[280px] overflow-hidden rounded-xl border border-[#A55734]/25">
      {data && (
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxAccessToken}
          initialViewState={DEFAULT_VIEW}
          minZoom={4.5}
          maxZoom={9}
          maxBounds={FRANCE_BOUNDS}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={true}
          interactiveLayerIds={[FILL_LAYER_ID]}
          onLoad={(e) => setMapInstance(e.target)}
        >
          <Source id="insp-territories" type="geojson" data={data}>
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
          {popup && (
            <Popup
              longitude={popup.lng}
              latitude={popup.lat}
              anchor="bottom"
              onClose={() => setPopup(null)}
              closeButton={true}
              closeOnClick={false}
              offset={16}
              maxWidth="280px"
            >
              <div className="min-w-[200px] max-w-[260px] px-0.5 py-1 font-courier">
                <p className="text-sm font-bold text-[#A55734]">{popup.name}</p>
                <p className="mt-1 text-xs leading-snug text-[#333]/80">
                  La liste ci-dessous est filtrée sur cette zone.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="#liste-territoires-inspiration"
                    className="inline-flex rounded-full border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95"
                    onClick={() => setPopup(null)}
                  >
                    En savoir plus
                  </Link>
                  <button
                    type="button"
                    className="rounded-full border border-[#A55734]/35 px-3 py-1.5 text-xs font-bold text-[#A55734] hover:bg-[#FFF2EB]"
                    onClick={() => setPopup(null)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      )}
      {(loading || loadError || !data) && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl font-courier text-sm ${
            data ? "bg-white/75" : "bg-[#FFF2EB]/50"
          } text-[#333]/70`}
        >
          {loadError
            ? "Impossible de charger les régions (fichier GeoJSON)."
            : "Chargement des régions…"}
        </div>
      )}
    </div>
  );
}
