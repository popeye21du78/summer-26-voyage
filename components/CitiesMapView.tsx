"use client";

import { useState, useMemo } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LieuPoint, LieuType } from "../lib/lieux-types";

const TYPE_COLORS: Record<LieuType, string> = {
  patrimoine: "#a8987a",
  pepite: "#6b8e6b",
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
    <div className="h-full w-full min-h-[400px] rounded-lg overflow-hidden border border-[#A55734]/30">
      <Map
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
          <Marker
            key={lieu.id}
            longitude={lieu.lng}
            latitude={lieu.lat}
            anchor="center"
          >
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setHoveredId(lieu.id)}
              onMouseLeave={() => setHoveredId(null)}
              role="button"
              aria-label={lieu.nom}
              title={lieu.departement ? `${lieu.nom} (${lieu.departement})` : lieu.nom}
            >
              <div
                className="rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor:
                    lieu.plus_beaux_villages === "oui" ? "#A55734" : TYPE_COLORS[lieu.type] ?? "#a8987a",
                }}
              />
              {hoveredId === lieu.id && (
                <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#FAF4F0] px-2 py-1 text-xs font-medium text-[#333333] shadow-lg ring-1 ring-[#A55734]/30">
                  {lieu.nom}
                  {lieu.departement ? (
                    <span className="ml-1 text-[#333333]/70">
                      ({lieu.departement}) — {lieu.type}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
