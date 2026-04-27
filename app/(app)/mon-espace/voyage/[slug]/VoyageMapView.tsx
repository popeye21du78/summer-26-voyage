"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchVoyageRoute } from "@/lib/mapbox-driving-route";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";

type StepCoord = { id: string; nom: string; lat: number; lng: number };

type Props = {
  steps: StepCoord[];
  mapboxToken: string | undefined;
  /** Profil Mapbox (voiture vs vélo) — aligné sur le carnet `created-`. */
  routeProfile?: MapboxRouteProfile;
};

/**
 * L’itinéraire routier est **recalculé** à chaque changement d’ordre / de points
 * (ne pas réutiliser une GeoJSON figée côté carnet, sinon les étapes ajoutées
 * n’apparaissent pas sur le tracé).
 */
export default function VoyageMapView({
  steps,
  mapboxToken,
  routeProfile = "driving",
}: Props) {
  const mapRef = useRef<any>(null);
  const routeReq = useRef(0);

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

  const [driving, setDriving] = useState<{
    geometry: { type: "LineString"; coordinates: [number, number][] } | null;
    totalKm: number;
    totalMin: number;
    avoidMotorways?: boolean;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const waypointsKey = useMemo(
    () =>
      steps
        .filter(
          (s) =>
            Number.isFinite(s.lat) &&
            Number.isFinite(s.lng) &&
            Math.abs(s.lat) <= 90 &&
            Math.abs(s.lng) <= 180
        )
        .map((s) => `${s.id}:${s.lng.toFixed(5)},${s.lat.toFixed(5)}`)
        .join("|"),
    [steps]
  );

  useEffect(() => {
    const wps = steps
      .filter(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng) &&
          Math.abs(s.lat) <= 90 &&
          Math.abs(s.lng) <= 180
      )
      .map((s) => ({ lat: s.lat, lng: s.lng }));
    if (wps.length < 2) {
      setDriving(null);
      setRouteLoading(false);
      return;
    }
    const my = ++routeReq.current;
    setRouteLoading(true);
    const t = setTimeout(() => {
      void fetchVoyageRoute(wps, {
        profile: routeProfile,
        excludeMotorway: routeProfile === "driving",
      }).then((r) => {
        if (my !== routeReq.current) return;
        setRouteLoading(false);
        if (r?.geometry?.coordinates && r.geometry.coordinates.length >= 2) {
          setDriving({
            geometry: r.geometry,
            totalKm: r.distanceKm,
            totalMin: r.durationMin,
            avoidMotorways: r.avoidMotorways,
          });
        } else {
          setDriving({
            geometry: {
              type: "LineString",
              coordinates: wps.map((p) => [p.lng, p.lat] as [number, number]),
            },
            totalKm: 0,
            totalMin: 0,
          });
        }
      });
    }, 200);
    return () => {
      clearTimeout(t);
    };
  }, [waypointsKey, routeProfile]);

  /** Cadrage : enveloppe de la **route** si dispo, sinon des marqueurs. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || steps.length === 0) return;
    const coords = driving?.geometry?.coordinates;
    if (coords && coords.length >= 2) {
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
        try {
          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: 44, duration: 650, maxZoom: 9 }
          );
        } catch {
          /* map pas prête */
        }
        return;
      }
    }
    const lngs = steps.map((s) => s.lng);
    const lats = steps.map((s) => s.lat);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs) - 0.5, Math.min(...lats) - 0.3],
      [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.3],
    ];
    try {
      map.fitBounds(bounds, { padding: 40, duration: 800 });
    } catch {
      /* */
    }
  }, [steps, driving]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-gradient-end)]">
        <p className="font-courier text-xs text-white/30">Carte indisponible</p>
      </div>
    );
  }

  const valid = steps.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) <= 90
  );
  const straight: [number, number][] = valid.map((s) => [s.lng, s.lat]);

  const showLine =
    driving?.geometry?.coordinates &&
    driving.geometry.coordinates.length >= 2
      ? driving.geometry
      : valid.length >= 2
        ? { type: "LineString" as const, coordinates: straight }
        : null;

  const route =
    showLine && showLine.coordinates.length >= 2
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: showLine,
        }
      : null;

  return (
    <div className="relative h-full w-full">
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
                "line-width": routeLoading && !driving?.geometry ? 2 : 3,
                "line-opacity": routeLoading && !driving?.geometry ? 0.4 : 0.78,
              }}
            />
          </Source>
        )}
        {valid.map((s, i) => (
          <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--color-accent-start)] font-title text-[10px] font-bold text-white shadow-lg">
              {i + 1}
            </div>
          </Marker>
        ))}
      </Map>
      {valid.length >= 2 && driving && driving.totalKm > 0 && !routeLoading && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 max-w-[min(100%,14rem)] rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 text-right font-courier text-[10px] leading-snug text-white/90 backdrop-blur-sm">
          <span className="block text-[9px] text-white/50">
            {driving.avoidMotorways === false
              ? "Priorité secondaires ; autoroutes si nécessaire"
              : "Sans autoroute (priorité)"}
          </span>
          <span className="mt-0.5 block">
            {driving.totalKm} km
            <span className="text-white/50"> · </span>
            {formatDuration(driving.totalMin)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
