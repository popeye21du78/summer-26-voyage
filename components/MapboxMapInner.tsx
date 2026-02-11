"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  useMap,
} from "react-map-gl/mapbox";
import * as turf from "@turf/turf";
import {
  buildRouteGeoJSON,
  buildRouteSingleLineGeoJSON,
  type SegmentProperties,
} from "../lib/routeSegments";
import type { Step, NuiteeType } from "../types";

/** Taille et couleur du marqueur selon nuitees et type */
function getMarkerStyle(
  nuiteeType: NuiteeType | null | undefined,
  nuitees: number
) {
  const baseSize = 10;
  const size = Math.min(28, baseSize + Math.max(0, nuitees) * 4);
  switch (nuiteeType) {
    case "airbnb":
      return { size, color: "#A55734" };
    case "van":
      return { size, color: "#a8987a" };
    case "passage":
      return { size: 10, color: "#c4b89a" };
    default:
      return { size: 10, color: "#A55734" };
  }
}
import Link from "next/link";
import { CityPhoto } from "./CityPhoto";

/** Popup ville en overlay fixe en bas de la carte – uniquement au clic. */
function CityPopupOverlay({
  step,
  label,
  onClose,
  popupRef,
}: {
  step: Step;
  label: string;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement | null>;
}) {
  const cachedPhoto = step.contenu_voyage.photos[0] ?? null;

  return (
    <div
      ref={popupRef}
      className="absolute bottom-2 left-1/2 z-10 w-[220px] -translate-x-1/2 rounded border-2 border-[#A55734] bg-[#FAF4F0] p-2 shadow-lg"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-1 top-1 rounded p-0.5 text-[#6b6b6b] hover:bg-[#A55734]/20"
        aria-label="Fermer"
      >
        ×
      </button>
      <div className="flex flex-col gap-2">
        <div className="relative h-16 w-full shrink-0 overflow-hidden rounded bg-[#A55734]/15">
          <CityPhoto
            stepId={step.id}
            ville={step.nom}
            initialUrl={cachedPhoto}
            alt={step.nom}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 shrink-0 pr-5 text-[#333333]">
          <p className="truncate text-xs font-medium">{label}</p>
          <p className="text-[10px] text-[#333333]/70">
            {step.date_prevue} • {step.budget_prevu} €
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Link
            href={`/ville/${step.id}`}
            className="block rounded bg-[#A55734] px-2 py-1.5 text-center text-[10px] font-medium text-white no-underline transition-colors hover:bg-[#8b4728]"
          >
            Infos ville
          </Link>
          <Link
            href={`/book#${step.id}`}
            className="block rounded border border-[#A55734] px-2 py-1.5 text-center text-[10px] font-medium text-[#A55734] no-underline transition-colors hover:bg-[#A55734]/10"
          >
            Voir dans le Book
          </Link>
          <Link
            href={`/book/${step.id}/editer`}
            className="block rounded border border-[#A55734] px-2 py-1.5 text-center text-[10px] font-medium text-[#A55734] no-underline transition-colors hover:bg-[#A55734]/10"
          >
            Créer / Modifier
          </Link>
        </div>
      </div>
    </div>
  );
}

type MapboxMapInnerProps = {
  mapboxAccessToken: string;
  initialViewState: { longitude: number; latitude: number; zoom: number };
  minZoom: number;
  maxZoom: number;
  maxBounds?: [[number, number], [number, number]];
  mapStyle: string;
};

const ROUTE_LAYER_ID = "route-hit";
const ROUTE_GLOW_LAYER_ID = "route-glow";
const ROUTE_SOURCE_ID = "route";
const ROUTE_SINGLE_SOURCE_ID = "route-single";

/** Calcule le libellé "J+X" à partir de la date de la première étape */
function getDayLabel(step: Step, index: number, steps: Step[]): string {
  if (index === 0 || !step.date_prevue) return "J+0";
  const firstWithDate = steps.find((s) => s.date_prevue);
  if (!firstWithDate?.date_prevue) return "J+0";
  const start = new Date(firstWithDate.date_prevue).getTime();
  const current = new Date(step.date_prevue).getTime();
  const days = Math.round((current - start) / (1000 * 60 * 60 * 24));
  return `J+${days}`;
}

/** Animation du trait (gradient qui avance) + hover sur le tracé */
function RouteEffects({
  onHoverSegment,
  onHoverEnd,
}: {
  onHoverSegment: (props: SegmentProperties, lngLat: { lng: number; lat: number }) => void;
  onHoverEnd: () => void;
}) {
  const mapCollection = useMap();
  const mapRef = mapCollection?.current;
  const map = mapRef?.getMap?.();
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  /** Vitesse : 0.1 = un cycle complet en 10 s → une nouvelle vague tous les 2 s (5 vagues) */
  const VITESSE_FLUX_PAR_SECONDE = 0.1;

  useEffect(() => {
    if (!map || typeof map.getSource !== "function") return;

    const waitForRoute = () => {
      try {
        const hasSource = map.getSource?.(ROUTE_SOURCE_ID);
        const hasSingleSource = map.getSource?.(ROUTE_SINGLE_SOURCE_ID);
        const hasLayer = map.getLayer?.(ROUTE_LAYER_ID);
        if (!hasSource || !hasSingleSource || !hasLayer) {
          requestAnimationFrame(waitForRoute);
          return;
        }
        if (map.getLayer(ROUTE_GLOW_LAYER_ID)) return;
      } catch {
        return;
      }

      // Un seul type de tracé visible : flux en marron dégradé, sans pointillés de fond.
      // Période 0.2 = 5 vagues sur le trajet ; une nouvelle vague passe tous les 2 s (cycle 10 s).
      const bandPeriod = 0.2;
      map.addLayer({
        id: ROUTE_GLOW_LAYER_ID,
        type: "line",
        source: ROUTE_SINGLE_SOURCE_ID,
        paint: {
          "line-width": 5,
          "line-dasharray": [2, 2],
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["%", ["+", ["line-progress"], 0], bandPeriod],
            0,
            "transparent",
            0.05,
            "#C4A484",
            0.1,
            "#A55734",
            0.15,
            "#C4A484",
            0.2,
            "transparent",
          ],
        },
      });

      const animate = (now: number) => {
        if (lastTimeRef.current > 0) {
          const dt = (now - lastTimeRef.current) / 1000;
          offsetRef.current -= VITESSE_FLUX_PAR_SECONDE * dt;
          if (offsetRef.current < 0) offsetRef.current += 1;
        }
        lastTimeRef.current = now;
        const o = offsetRef.current;
        if (map.getLayer(ROUTE_GLOW_LAYER_ID)) {
          map.setPaintProperty(ROUTE_GLOW_LAYER_ID, "line-gradient", [
            "interpolate",
            ["linear"],
            ["%", ["+", ["line-progress"], o], bandPeriod],
            0,
            "transparent",
            0.05,
            "#C4A484",
            0.1,
            "#A55734",
            0.15,
            "#C4A484",
            0.2,
            "transparent",
          ]);
        }
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    };
    waitForRoute();

    const onMove = (e: { point: { x: number; y: number }; lngLat: { lng: number; lat: number } }) => {
      try {
        if (!map?.getLayer?.(ROUTE_LAYER_ID)) return;
        const features = map.queryRenderedFeatures([e.point.x, e.point.y], {
          layers: [ROUTE_LAYER_ID],
        });
        if (features.length > 0 && features[0].properties) {
          const p = features[0].properties as unknown as SegmentProperties;
          onHoverSegment(p, { lng: e.lngLat.lng, lat: e.lngLat.lat });
          const c = map.getCanvas?.();
          if (c) c.style.cursor = "pointer";
        } else {
          onHoverEnd();
          const c = map.getCanvas?.();
          if (c) c.style.cursor = "";
        }
      } catch {
        onHoverEnd();
      }
    };

    const onLeave = () => {
      onHoverEnd();
      const c = map.getCanvas?.();
      if (c) c.style.cursor = "";
    };

    map.on("mousemove", onMove);
    const canvas = map.getCanvas?.();
    if (canvas) canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(animRef.current);
      try {
        map.off("mousemove", onMove);
        const c = map.getCanvas?.();
        if (c) c.removeEventListener("mouseleave", onLeave);
        if (map.getLayer?.(ROUTE_GLOW_LAYER_ID)) map.removeLayer(ROUTE_GLOW_LAYER_ID);
      } catch {
        // Map déjà démontée (ex. navigation) – ignore
      }
    };
  }, [map, onHoverSegment, onHoverEnd]);

  return null;
}

export default function MapboxMapInner({
  mapboxAccessToken,
  initialViewState,
  minZoom,
  maxZoom,
  maxBounds,
  mapStyle,
}: MapboxMapInnerProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [hoveredStep, setHoveredStep] = useState<Step | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{
    props: SegmentProperties;
    lngLat: { lng: number; lat: number };
  } | null>(null);

  useEffect(() => {
    fetch("/api/steps")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.steps)) setSteps(data.steps);
      })
      .catch(() => {});
  }, []);

  const stepsWithLabel = useMemo(
    () =>
      steps.map((step, index) => ({
        step,
        label: `${getDayLabel(step, index, steps)} – ${step.nom}`,
      })),
    [steps]
  );

  const routeGeoJSON = useMemo(() => buildRouteGeoJSON(steps), [steps]);
  const routeSingleGeoJSON = useMemo(
    () => buildRouteSingleLineGeoJSON(steps),
    [steps]
  );

  const cityPopupActiveRef = useRef(false);
  useEffect(() => {
    cityPopupActiveRef.current = !!selectedStep;
  }, [selectedStep]);

  useEffect(() => {
    if (!selectedStep) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-city-marker]")) return;
      setSelectedStep(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedStep]);

  const handleSegmentHover = useCallback(
    (props: SegmentProperties, lngLat: { lng: number; lat: number }) => {
      if (cityPopupActiveRef.current) return;
      const hoverPt = turf.point([lngLat.lng, lngLat.lat]);
      const nearCity = steps.some((s) => {
        const cityPt = turf.point([
          s.coordonnees.lng,
          s.coordonnees.lat,
        ]);
        return turf.distance(hoverPt, cityPt, { units: "kilometers" }) < 10;
      });
      if (nearCity) return;
      setHoveredSegment({ props, lngLat });
    },
    [steps]
  );
  const handleSegmentHoverEnd = useCallback(() => setHoveredSegment(null), []);

  const handleMarkerMouseEnter = useCallback((step: Step) => {
    setHoveredSegment(null);
    setHoveredStep(step);
  }, []);

  const handleMarkerMouseLeave = useCallback(() => {
    setHoveredStep(null);
  }, []);

  return (
    <div className="relative h-full w-full">
    <Map
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={initialViewState}
      minZoom={minZoom}
      maxZoom={maxZoom}
      maxBounds={maxBounds}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      attributionControl={true}
    >
      <Source
        id={ROUTE_SOURCE_ID}
        type="geojson"
        data={routeGeoJSON}
        lineMetrics={true}
      />
      <Source
        id={ROUTE_SINGLE_SOURCE_ID}
        type="geojson"
        data={routeSingleGeoJSON}
        lineMetrics={true}
      />
      {/* Couche invisible pour le survol (infos segment) */}
      <Layer
        id={ROUTE_LAYER_ID}
        type="line"
        source={ROUTE_SOURCE_ID}
        paint={{
          "line-color": "#A55734",
          "line-width": 14,
          "line-opacity": 0,
        }}
      />

      <RouteEffects
        onHoverSegment={handleSegmentHover}
        onHoverEnd={handleSegmentHoverEnd}
      />

      {stepsWithLabel.map(({ step, label }) => {
        const nuitees = step.nuitees ?? 0;
        const { size, color } = getMarkerStyle(step.nuitee_type, nuitees);
        return (
        <Marker
          key={step.id}
          longitude={step.coordonnees.lng}
          latitude={step.coordonnees.lat}
          anchor="center"
        >
          <div
            data-city-marker
            className="group relative inline-block cursor-pointer"
            title={label}
            onMouseEnter={() => handleMarkerMouseEnter(step)}
            onMouseLeave={handleMarkerMouseLeave}
            onClick={() => setSelectedStep(step)}
            role="button"
            aria-label={label}
          >
            <div
              className="flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-150 ease-out group-hover:scale-125"
              style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
                transformOrigin: "center",
                backgroundColor: selectedStep?.id === step.id ? "#8b4728" : color,
              }}
            >
              {nuitees > 0 && (
                <span
                  className="font-bold text-white leading-none"
                  style={{ fontSize: Math.max(8, size - 6) }}
                >
                  {nuitees}
                </span>
              )}
            </div>
            {hoveredStep?.id === step.id && (
              <span className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#333333] shadow-sm ring-1 ring-[#A55734/30]/50">
                {label.split("–")[0]?.trim() || "J+0"} · {step.nom}
              </span>
            )}
          </div>
        </Marker>
        );
      })}

      {hoveredSegment && !selectedStep && (
        <Popup
          longitude={hoveredSegment.lngLat.lng}
          latitude={hoveredSegment.lngLat.lat}
          anchor="top"
          closeButton={false}
          className="van-tooltip-popup"
        >
          <div className="min-w-[160px] space-y-1 text-sm text-[#333333]">
            <div className="font-medium">
              {hoveredSegment.props.fromName} → {hoveredSegment.props.toName}
            </div>
            <div>
              <span className="text-[#6b6b6b]">Distance :</span>{" "}
              {hoveredSegment.props.distanceKm} km
            </div>
            <div>
              <span className="text-[#6b6b6b]">Temps :</span>{" "}
              {Math.floor(hoveredSegment.props.durationMin / 60)} h{" "}
              {hoveredSegment.props.durationMin % 60} min
            </div>
            <div>
              <span className="text-[#6b6b6b]">Péages :</span>{" "}
              {hoveredSegment.props.tollCost > 0
                ? `${hoveredSegment.props.tollCost.toFixed(1)} €`
                : "—"}
            </div>
          </div>
        </Popup>
      )}
    </Map>
    {selectedStep && (
      <CityPopupOverlay
        step={selectedStep}
        label={
          stepsWithLabel.find((s) => s.step.id === selectedStep.id)?.label ??
          selectedStep.nom
        }
        onClose={() => setSelectedStep(null)}
        popupRef={popupRef}
      />
    )}
    </div>
  );
}
