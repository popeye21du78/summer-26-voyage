"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type StepCoord = { id: string; nom: string; lat: number; lng: number };

type Props = {
  steps: StepCoord[];
  mapboxToken: string | undefined;
};

export default function VoyageMapView({ steps, mapboxToken }: Props) {
  const mapRef = useRef<any>(null);

  // Mapbox `paint` n'accepte PAS `var(--...)`. On résout donc la couleur
  // d'accent au runtime (à partir de la variable CSS) et on la ré-évalue
  // quand le moodboard change (attribut `data-moodboard` sur <html>).
  const [accentHex, setAccentHex] = useState<string>("#e07856");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-start")
        .trim();
      if (raw) setAccentHex(raw);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-moodboard", "data-font-preset", "class", "style"],
    });
    return () => mo.disconnect();
  }, []);

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
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-gradient-end)]">
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
              "line-color": accentHex,
              "line-width": 3,
              "line-opacity": 0.7,
            }}
          />
        </Source>
      )}
      {steps.map((s, i) => (
        <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--color-accent-start)] font-title text-[10px] font-bold text-white shadow-lg">
            {i + 1}
          </div>
        </Marker>
      ))}
    </Map>
  );
}
