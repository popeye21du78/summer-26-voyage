"use client";

import { useEffect, useRef } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type StepCoord = { id: string; nom: string; lat: number; lng: number };

type Props = {
  steps: StepCoord[];
  mapboxToken: string | undefined;
};

export default function VoyageMapView({ steps, mapboxToken }: Props) {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || steps.length === 0) return;
    const map = mapRef.current;

    const lngs = steps.map((s) => s.lng);
    const lats = steps.map((s) => s.lat);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs) - 0.5, Math.min(...lats) - 0.3],
      [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.3],
    ];

    try {
      map.fitBounds(bounds, { padding: 40, duration: 800 });
    } catch {
      // map might not be ready
    }
  }, [steps]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a120d]">
        <p className="font-courier text-xs text-white/30">Carte indisponible</p>
      </div>
    );
  }

  const route =
    steps.length >= 2
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: steps.map((s) => [s.lng, s.lat]),
          },
        }
      : null;

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{
        longitude: steps[0]?.lng ?? 2.3,
        latitude: steps[0]?.lat ?? 46.6,
        zoom: 5,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      attributionControl={false}
    >
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              "line-color": "#E07856",
              "line-width": 3,
              "line-opacity": 0.7,
            }}
          />
        </Source>
      )}
      {steps.map((s, i) => (
        <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#E07856] font-courier text-[10px] font-bold text-white shadow-lg">
            {i + 1}
          </div>
        </Marker>
      ))}
    </Map>
  );
}
