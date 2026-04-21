"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LieuPoint, LieuType } from "../lib/lieux-types";

const MapboxMap = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-[var(--color-bg-secondary)]/50 text-white/80/60">Chargement carte…</div> }
);
const MapMarker = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.Marker),
  { ssr: false }
);

const TYPE_COLORS: Record<LieuType, string> = {
  patrimoine: "#a8987a",
  plage: "#4a90d9",
  rando: "#8B6914",
};

/** Centre et zoom pour cadrer le Sud (10 villes ex. Lot, Tarn, Carcassonne, Collioure). */
const DEFAULT_CENTER = { longitude: 2.2, latitude: 43.8 };
const DEFAULT_ZOOM = 6.5;
const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41],
  [9.5, 51.5],
];

type CitiesMapViewProps = {
  lieux: LieuPoint[];
  mapboxAccessToken: string;
  /** Ex. "?from=voyage" pour le lien retour à la carte sur la page ville */
  villeLinkSearch?: string;
};

/** Garde une seule occurrence par lieu (même id) pour éviter les clés dupliquées. */
function uniqueLieux(lieux: LieuPoint[]): LieuPoint[] {
  const seen = new Set<string>();
  return lieux.filter((lieu) => {
    if (seen.has(lieu.id)) return false;
    seen.add(lieu.id);
    return true;
  });
}

export default function CitiesMapView({
  lieux,
  mapboxAccessToken,
  villeLinkSearch,
}: CitiesMapViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const lieuxUnique = useMemo(() => uniqueLieux(lieux), [lieux]);

  const initialViewState = useMemo(
    () => ({
      ...DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    }),
    []
  );

  return (
    <div className="h-full w-full min-h-[400px] rounded-lg overflow-hidden border border-[var(--color-accent-start)]/30">
      <MapboxMap
        mapboxAccessToken={mapboxAccessToken}
        initialViewState={initialViewState}
        minZoom={5}
        maxZoom={14}
        maxBounds={FRANCE_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={true}
      >
        {lieuxUnique.map((lieu) => (
          <MapMarker
            key={lieu.id}
            longitude={lieu.lng}
            latitude={lieu.lat}
            anchor="center"
          >
            <Link
              href={`/inspirer/ville/${lieu.slug}${villeLinkSearch ?? ""}`}
              className="relative block cursor-pointer"
              onMouseEnter={() => setHoveredId(lieu.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={lieu.nom}
            >
              <div
                className="rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor:
                    lieu.plus_beaux_villages === "oui" ? "var(--color-accent-start)" : TYPE_COLORS[lieu.type] ?? "#a8987a",
                }}
              />
              {hoveredId === lieu.id && (
                <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-white px-2 py-1.5 text-xs shadow-lg ring-1 ring-[var(--color-accent-start)]/30">
                  <div className="font-medium text-white/80">{lieu.nom}</div>
                  {lieu.departement ? (
                    <div className="text-white/80/70">{lieu.departement} — {lieu.type}</div>
                  ) : null}
                  <div className="text-[var(--color-accent-start)] mt-0.5">Cliquer pour en savoir plus</div>
                </div>
              )}
            </Link>
          </MapMarker>
        ))}
      </MapboxMap>
    </div>
  );
}
