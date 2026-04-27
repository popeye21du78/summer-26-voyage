"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MapRef } from "react-map-gl/mapbox";
import { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Carte Mapbox LIVE du brouillon d'itinéraire (section Préparer > Itinéraire).
 *
 * Fonctionnalités demandées par l'user :
 *  - Dès qu'on ajoute une nuit/une ville, le point apparaît sur la carte.
 *  - Quand on réordonne les étapes (drag & drop), les numéros affichés
 *    sur la carte suivent immédiatement le nouvel ordre.
 *  - La carte fitBounds sur le set courant pour qu'on voie toujours
 *    tous les points, sans avoir à naviguer manuellement.
 *  - Le style est discret (variant "light-v11") pour ne pas voler la
 *    vedette au reste de la fiche de préparation.
 *
 * L’itinéraire routier (ligne) et le résumé km/min viennent en props
 * quand le parent a appelé l’API Directions.
 */
const Map = dynamic(() => import("react-map-gl/mapbox").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--color-bg-secondary)]/40 font-courier text-xs text-[var(--color-text-secondary)]">
      Chargement carte…
    </div>
  ),
});

export type LiveStep = {
  id: string;
  nom: string;
  type: "nuit" | "passage";
  lat: number;
  lng: number;
};

type RouteLine = {
  type: "LineString";
  coordinates: [number, number][];
};

type Props = {
  steps: LiveStep[];
  mapboxAccessToken: string | undefined;
  className?: string;
  /** Tracé routier Mapbox (optionnel) — remplace le simple fil à plomb entre les points. */
  routeLine?: RouteLine | null;
  /** Résumé affiché sous la carte. */
  routeSummary?: { totalKm: number; totalMin: number } | null;
};

const INITIAL_VIEW = {
  longitude: 2.35,
  latitude: 46.8,
  zoom: 4.5,
};

export default function ItineraireLiveMap({
  steps,
  mapboxAccessToken,
  className,
  routeLine,
  routeSummary,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [accentHex, setAccentHex] = useState("#e07856");
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
      attributeFilter: ["data-moodboard", "class", "style"],
    });
    return () => mo.disconnect();
  }, []);

  const routeFeature = useMemo(() => {
    if (!routeLine?.coordinates?.length) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: routeLine,
    };
  }, [routeLine]);

  /** Points valides (lat/lng finis, non-NaN). On jette silencieusement les POI mal formés. */
  const validSteps = useMemo(
    () =>
      steps.filter(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng) &&
          Math.abs(s.lat) <= 90 &&
          Math.abs(s.lng) <= 180
      ),
    [steps]
  );

  /**
   * Recentrage automatique quand le set de steps change : fitBounds sur
   * l'enveloppe des points + padding généreux en bas/haut pour ne rien
   * cacher derrière les cartes voisines et la bottom nav.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coords = routeLine?.coordinates;
    if (coords?.length) {
      try {
        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;
        for (const c of coords) {
          const [lng, lat] = c;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        if (Number.isFinite(minLng)) {
          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: { top: 48, bottom: 48, left: 40, right: 40 }, duration: 550, maxZoom: 9 }
          );
          return;
        }
      } catch {
        /* ignore */
      }
    }
    if (validSteps.length === 0) return;
    try {
      if (validSteps.length === 1) {
        map.easeTo({
          center: [validSteps[0].lng, validSteps[0].lat],
          zoom: 7,
          duration: 600,
        });
        return;
      }
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const s of validSteps) {
        if (s.lng < minLng) minLng = s.lng;
        if (s.lng > maxLng) maxLng = s.lng;
        if (s.lat < minLat) minLat = s.lat;
        if (s.lat > maxLat) maxLat = s.lat;
      }
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          duration: 550,
          maxZoom: 9,
        }
      );
    } catch {
      /* no-op : style pas prêt, on réessaiera au prochain render */
    }
  }, [validSteps, routeLine]);

  if (!mapboxAccessToken) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-bg-secondary)]/40 font-courier text-xs text-[var(--color-text-secondary)] ${className ?? ""}`}
      >
        Carte indisponible
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--color-glass-border)] shadow-[0_8px_20px_var(--color-shadow)] ${className ?? ""}`}
    >
      <div className="relative min-h-0 flex-1">
      <Map
        ref={(instance) => {
          mapRef.current = instance;
        }}
        mapboxAccessToken={mapboxAccessToken}
        initialViewState={INITIAL_VIEW}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        reuseMaps
      >
        {routeFeature && (
          <Source id="itineraire-route" type="geojson" data={routeFeature}>
            <Layer
              id="itineraire-route-line"
              type="line"
              paint={{
                "line-color": accentHex,
                "line-width": 4,
                "line-opacity": 0.82,
              }}
            />
          </Source>
        )}
        {validSteps.map((step, idx) => {
          const isNuit = step.type === "nuit";
          return (
            <Marker
              key={step.id}
              longitude={step.lng}
              latitude={step.lat}
              anchor="center"
            >
              {/**
               * Pastille numérotée — couleur accent pour les nuits,
               * plus effacée pour les simples passages (visuel 1:1 avec
               * la distinction passage/nuit de la liste).
               */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-courier text-[11px] font-bold shadow-[0_4px_10px_rgba(0,0,0,0.25)] ring-2 ring-white transition ${
                  isNuit
                    ? "bg-[var(--color-accent-start)] text-white"
                    : "bg-white text-[var(--color-accent-start)] ring-[var(--color-accent-start)]/30"
                }`}
                title={`${idx + 1}. ${step.nom}`}
              >
                {idx + 1}
              </div>
            </Marker>
          );
        })}
      </Map>
      {/** Affichage "vide" quand aucun step n'a encore été ajouté. */}
      {validSteps.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-bg-main)]/55 text-center font-courier text-[11px] text-[var(--color-text-secondary)] backdrop-blur-sm">
          Ajoute une étape pour la voir apparaître sur la carte.
        </div>
      )}
      </div>
      {routeSummary && routeSummary.totalKm > 0 && (
        <div className="shrink-0 border-t border-[var(--color-glass-border)] bg-[var(--color-glass-bg)]/90 px-3 py-2 text-center font-courier text-[10px] text-[var(--color-text-primary)]/85 backdrop-blur-sm">
          Route (hors autoroute en priorité) · {routeSummary.totalKm} km ·{" "}
          {formatDriveDuration(routeSummary.totalMin)}
        </div>
      )}
    </div>
  );
}

function formatDriveDuration(min: number): string {
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `~${h} h ${m} min` : `~${h} h`;
}
