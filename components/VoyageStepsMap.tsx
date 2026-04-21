"use client";

import {
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Crosshair } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapRef } from "react-map-gl/mapbox";
import type { Step } from "../types";
import { StepLieuThumb } from "./StepLieuThumb";

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
  /** Slug du voyage (URL) → `?v=slug` pour « Retour au voyage » depuis la fiche ville */
  voyageReturnSlug?: string;
  /** Hauteur en px (ignoré si fillHeight) */
  height?: number;
  /** Remplit le parent en hauteur (ex. moitié haute écran mobile) */
  fillHeight?: boolean;
  /** Carte intégrée : coins arrondis, dégradés, marqueurs photo + libellé */
  variant?: "default" | "premium" | "fullBleed";
  /** Bouton recentrer sur les étapes (plein écran / fullBleed) */
  showRecenter?: boolean;
  /** Masque le dégradé bas (si overlay carte déjà présent) */
  hideBottomGradient?: boolean;
};

function villeHref(id: string, voyageReturnSlug?: string) {
  const q =
    voyageReturnSlug && /^[a-zA-Z0-9_-]+$/.test(voyageReturnSlug)
      ? `?v=${encodeURIComponent(voyageReturnSlug)}`
      : "";
  return `/ville/${id}${q}`;
}

export default function VoyageStepsMap({
  steps,
  mapboxAccessToken,
  linkToVille = false,
  voyageReturnSlug,
  height = 400,
  fillHeight = false,
  variant = "default",
  showRecenter = false,
  hideBottomGradient = false,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);

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
    const z = span < 0.5 ? 9 : span < 2 ? 7 : 6;
    return {
      center: { longitude: lng, latitude: lat },
      zoom: z,
    };
  }, [steps]);

  const fitToSteps = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || steps.length === 0) return;
    const lngs = steps.map((s) => s.coordonnees.lng);
    const lats = steps.map((s) => s.coordonnees.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    try {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 48, bottom: 56, left: 24, right: 24 },
          maxZoom: 12,
          duration: 800,
        }
      );
    } catch {
      // ignore
    }
  }, [steps]);

  useEffect(() => {
    const t = window.setTimeout(() => fitToSteps(), 100);
    return () => window.clearTimeout(t);
  }, [fitToSteps, steps]);

  const sizeStyle = fillHeight
    ? { height: "100%", minHeight: 0 }
    : { height };

  if (!mapboxAccessToken) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-[var(--color-accent-start)]/30 bg-[var(--color-bg-main)]/30 ${fillHeight ? "h-full min-h-[120px]" : ""}`}
        style={fillHeight ? { minHeight: 120 } : sizeStyle}
      >
        <p className="text-sm text-white/70">Token Mapbox requis</p>
      </div>
    );
  }

  const isPremium = variant === "premium";
  const isFullBleed = variant === "fullBleed";

  const inner = (
    <MapboxMap
      ref={mapRef}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={{ ...center, zoom }}
      minZoom={5}
      maxZoom={14}
      maxBounds={FRANCE_BOUNDS}
      mapStyle="mapbox://styles/mapbox/light-v11"
      style={{ width: "100%", height: "100%" }}
    >
      {steps.map((step) => {
        let markerChild: ReactNode;
        if (isPremium || isFullBleed) {
          const block = (
            <div className="flex flex-col items-center">
              <div
                className="h-12 w-12 overflow-hidden rounded-full border-[3px] border-white shadow-lg ring-2 ring-[var(--color-accent-start)]/40"
                title={step.nom}
              >
                <StepLieuThumb
                  stepId={step.id}
                  nom={step.nom}
                  className="h-full w-full min-h-[48px] min-w-[48px]"
                  roundedClassName="rounded-none"
                />
              </div>
              <div className="mt-1 max-w-[min(140px,28vw)] truncate rounded-full bg-white/95 px-2.5 py-0.5 text-center text-[10px] font-bold tracking-wide text-neutral-800 shadow-md backdrop-blur-sm">
                {step.nom}
              </div>
            </div>
          );
          markerChild = linkToVille ? (
            <Link href={villeHref(step.id, voyageReturnSlug)} className="block">
              {block}
            </Link>
          ) : (
            block
          );
        } else if (linkToVille) {
          markerChild = (
            <Link
              href={villeHref(step.id, voyageReturnSlug)}
              className="block rounded-full border-2 border-white bg-[var(--color-accent-start)] p-1.5 shadow-md transition hover:scale-110"
              style={{ width: 24, height: 24 }}
              title={step.nom}
            >
              <span className="sr-only">{step.nom}</span>
            </Link>
          );
        } else {
          markerChild = (
            <div
              className="rounded-full border-2 border-white bg-[var(--color-accent-start)] shadow-md"
              style={{ width: 14, height: 14 }}
              title={step.nom}
            />
          );
        }

        return (
          <MapMarker
            key={step.id}
            longitude={step.coordonnees.lng}
            latitude={step.coordonnees.lat}
            anchor={isPremium || isFullBleed ? "bottom" : "center"}
          >
            {markerChild}
          </MapMarker>
        );
      })}
    </MapboxMap>
  );

  if (isFullBleed) {
    return (
      <div
        className={`relative w-full ${fillHeight ? "h-full min-h-0" : ""}`}
        style={fillHeight ? { height: "100%", minHeight: 0 } : sizeStyle}
      >
        <div className="absolute inset-0">{inner}</div>
        {/* Fondu beige en haut : transition propre vers le bandeau / titre */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[var(--color-bg-main)] via-[var(--color-bg-main)]/75 to-transparent md:h-24"
          aria-hidden
        />
        {showRecenter && (
          <button
            type="button"
            onClick={fitToSteps}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-[var(--color-accent-start)]/40 bg-[var(--color-bg-main)]/95 px-3 py-1.5 text-xs font-bold text-[var(--color-accent-start)] shadow-lg backdrop-blur-sm transition hover:bg-[var(--color-bg-main)] md:bottom-14 md:py-2"
            aria-label="Recentrer la carte sur l’itinéraire"
          >
            <Crosshair className="h-4 w-4" />
            Recentrer
          </button>
        )}
        {!hideBottomGradient && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[var(--color-bg-main)] via-[var(--color-bg-main)]/92 to-transparent md:h-40"
            aria-hidden
          />
        )}
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div
        className="overflow-hidden rounded-lg border border-[var(--color-accent-start)]/30"
        style={{ height }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-[var(--color-accent-start)]/25"
      style={{ height }}
    >
      <div className="absolute inset-0">{inner}</div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-bg-main)] via-[var(--color-bg-main)]/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--color-bg-main)]/95 via-[var(--color-bg-main)]/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--color-bg-main)]/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-bg-main)]/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}
