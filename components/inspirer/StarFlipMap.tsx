"use client";

import { useEffect, useRef, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";

type Props = {
  steps: ResolvedStarStep[];
  activeStepIndex: number;
  mapboxToken: string | undefined;
};

const BW_MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export default function StarFlipMap({ steps, activeStepIndex, mapboxToken }: Props) {
  const mapRef = useRef<any>(null);

  const route = useMemo(() => {
    if (steps.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: steps.map((s) => [s.lng, s.lat]),
      },
    };
  }, [steps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || steps.length === 0) return;
    const bounds = steps.reduce(
      (b, s) => ({
        minLng: Math.min(b.minLng, s.lng),
        maxLng: Math.max(b.maxLng, s.lng),
        minLat: Math.min(b.minLat, s.lat),
        maxLat: Math.max(b.maxLat, s.lat),
      }),
      { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
    );
    try {
      map.fitBounds(
        [
          [bounds.minLng - 0.15, bounds.minLat - 0.15],
          [bounds.maxLng + 0.15, bounds.maxLat + 0.15],
        ],
        { padding: 40, duration: 800 }
      );
    } catch {
      // ignore
    }
  }, [steps]);

  useEffect(() => {
    const map = mapRef.current;
    const step = steps[activeStepIndex];
    if (!map || !step) return;
    try {
      map.easeTo({ center: [step.lng, step.lat], duration: 500 });
    } catch {
      // ignore
    }
  }, [activeStepIndex, steps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onLoad = () => {
      try {
        const style = map.getStyle();
        if (!style?.layers) return;
        for (const layer of style.layers) {
          if (layer.type === "background") {
            map.setPaintProperty(layer.id, "background-color", "#f5f5f5");
          } else if (
            layer.type === "fill" &&
            (layer.id.includes("land") || layer.id.includes("background"))
          ) {
            map.setPaintProperty(layer.id, "fill-color", "#e8e8e8");
          } else if (layer.type === "fill" && layer.id.includes("water")) {
            map.setPaintProperty(layer.id, "fill-color", "#d0d0d0");
          } else if (layer.type === "line" && layer.id.includes("admin")) {
            map.setPaintProperty(layer.id, "line-color", "#999999");
          }
        }
      } catch {
        // style not loaded yet
      }
    };
    if (map.isStyleLoaded?.()) onLoad();
    else map.on?.("style.load", onLoad);
  }, []);

  if (!mapboxToken) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#1c1c1c] px-4 text-center">
        <p className="font-courier text-[10px] leading-relaxed text-white/40">
          Carte Mapbox indisponible : variable d’environnement{" "}
          <code className="text-white/55">NEXT_PUBLIC_MAPBOX_TOKEN</code> absente ou non injectée au build
          (Vercel / hébergeur). Sans ce token, le composant carte ne peut rien afficher.
        </p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{ latitude: 46.5, longitude: 2.5, zoom: 5 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={BW_MAP_STYLE}
      attributionControl={false}
      interactive={true}
    >
      {route && (
        <Source id="star-route" type="geojson" data={route}>
          <Layer
            id="star-route-line"
            type="line"
            paint={{
              "line-color": "#E07856",
              "line-width": 3,
              "line-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {steps.map((s, i) => {
        const isActive = i === activeStepIndex;
        return (
          <Marker key={s.slug} longitude={s.lng} latitude={s.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <span
                className={`whitespace-nowrap rounded px-1 font-courier font-bold leading-none transition-all duration-300 ${
                  isActive
                    ? "mb-0.5 text-[10px] text-[#E07856]"
                    : "mb-0 text-[8px] text-gray-500"
                }`}
                style={{
                  textShadow: "0 0 4px rgba(255,255,255,0.9)",
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {s.nom}
              </span>
              <div
                className="transition-all duration-300"
                style={{
                  width: isActive ? 14 : 8,
                  height: isActive ? 14 : 8,
                  borderRadius: "50%",
                  backgroundColor: "#E07856",
                  opacity: isActive ? 1 : 0.5,
                  border: isActive
                    ? "2.5px solid white"
                    : "1.5px solid rgba(255,255,255,0.6)",
                  boxShadow: isActive
                    ? "0 0 12px rgba(224,120,86,0.6)"
                    : "none",
                }}
              />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
