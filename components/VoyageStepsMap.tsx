"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Step } from "../types";

const MapboxMap = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.default),
  { ssr: false }
);
const MapMarker = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.Marker),
  { ssr: false }
);

const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41],
  [9.5, 51.5],
];

type Props = {
  steps: Step[];
  mapboxAccessToken: string;
  /** Si true, liens vers /ville/[slug] */
  linkToVille?: boolean;
  /** Hauteur en px */
  height?: number;
};

export default function VoyageStepsMap({
  steps,
  mapboxAccessToken,
  linkToVille = false,
  height = 400,
}: Props) {
  const { center, zoom } = useMemo(() => {
    if (steps.length === 0)
      return { center: { longitude: 2.5, latitude: 46.5 }, zoom: 5.5 };
    const lngs = steps.map((s) => s.coordonnees.lng);
    const lats = steps.map((s) => s.coordonnees.lat);
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const span = Math.max(
      Math.max(...lngs) - Math.min(...lngs),
      Math.max(...lats) - Math.min(...lats)
    );
    const zoom = span < 0.5 ? 9 : span < 2 ? 7 : 6;
    return {
      center: { longitude: lng, latitude: lat },
      zoom,
    };
  }, [steps]);

  if (!mapboxAccessToken) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/30"
        style={{ height }}
      >
        <p className="text-sm text-[#333333]/70">Token Mapbox requis</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-[#A55734]/30"
      style={{ height }}
    >
      <MapboxMap
        mapboxAccessToken={mapboxAccessToken}
        initialViewState={{ ...center, zoom }}
        minZoom={5}
        maxZoom={14}
        maxBounds={FRANCE_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        {steps.map((step, i) => (
          <MapMarker
            key={step.id}
            longitude={step.coordonnees.lng}
            latitude={step.coordonnees.lat}
            anchor="center"
          >
            {linkToVille ? (
              <Link
                href={`/ville/${step.id}`}
                className="block rounded-full border-2 border-white bg-[#A55734] p-1.5 shadow-md transition hover:scale-110"
                style={{ width: 24, height: 24 }}
                title={step.nom}
              >
                <span className="sr-only">{step.nom}</span>
              </Link>
            ) : (
              <div
                className="rounded-full border-2 border-white bg-[#A55734] shadow-md"
                style={{ width: 14, height: 14 }}
                title={step.nom}
              />
            )}
          </MapMarker>
        ))}
      </MapboxMap>
    </div>
  );
}
