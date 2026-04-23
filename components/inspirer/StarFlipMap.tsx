"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";
import type { MapRef } from "react-map-gl/mapbox";

type Props = {
  steps: ResolvedStarStep[];
  activeStepIndex: number;
  mapboxToken: string | undefined;
};

const BW_MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export default function StarFlipMap({ steps, activeStepIndex, mapboxToken }: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const hasDoneInitialFitRef = useRef(false);
  const [routeData, setRouteData] = useState<{
    segments: FeatureCollection | null;
    singleLine: FeatureCollection | null;
  } | null>(null);

  const fallbackRoute = useMemo(() => {
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
    if (!mapboxToken || steps.length < 2) {
      setRouteData(null);
      return;
    }
    const ac = new AbortController();
    fetch("/api/directions/route-geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: steps.map((step) => ({
          id: step.slug,
          nom: step.nom,
          coordonnees: { lat: step.lat, lng: step.lng },
        })),
      }),
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { segments?: FeatureCollection; singleLine?: FeatureCollection } | null) => {
        if (!data?.segments || !data?.singleLine) {
          setRouteData(null);
          return;
        }
        setRouteData({
          segments: data.segments,
          singleLine: data.singleLine,
        });
      })
      .catch(() => {
        setRouteData(null);
      });

    return () => ac.abort();
  }, [mapboxToken, steps]);

  const routeCoordinates = useMemo<[number, number][]>(() => {
    const feature = routeData?.singleLine?.features?.[0];
    if (feature?.geometry?.type === "LineString") {
      return (feature.geometry as LineString).coordinates as [number, number][];
    }
    return steps.map((step) => [step.lng, step.lat]);
  }, [routeData, steps]);

  /**
   * Ajuste la carte à l'ensemble des étapes.
   * On serre davantage le padding pour que l'itinéraire remplisse mieux la carte
   * dans le flip tout en gardant un peu d'air autour des marqueurs.
   */
  function fitToSteps(animate: boolean) {
    const map = mapRef.current;
    if (!map || steps.length === 0) return;

    const container = map.getContainer?.();
    const w = container?.clientWidth ?? 0;
    const h = container?.clientHeight ?? 0;
    if (w <= 0 || h <= 0) return;

    if (steps.length === 1) {
      const s = steps[0];
      try {
        map.jumpTo({ center: [s.lng, s.lat], zoom: 11.8 });
      } catch {
        // ignore
      }
      return;
    }

    const bounds = routeCoordinates.reduce(
      (b, s) => ({
        minLng: Math.min(b.minLng, s[0]),
        maxLng: Math.max(b.maxLng, s[0]),
        minLat: Math.min(b.minLat, s[1]),
        maxLat: Math.max(b.maxLat, s[1]),
      }),
      { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
    );

    const padding = {
      top: Math.max(18, Math.round(h * 0.08)),
      bottom: Math.max(18, Math.round(h * 0.08)),
      left: Math.max(14, Math.round(w * 0.06)),
      right: Math.max(14, Math.round(w * 0.06)),
    };

    try {
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        {
          padding,
          maxZoom: 14.2,
          duration: animate ? 500 : 0,
          essential: true,
        }
      );
    } catch {
      // ignore
    }
  }

  /** Déclencher le fit dès que la carte a une taille réelle (après flip + resize). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let raf1 = 0;
    let raf2 = 0;
    const run = () => {
      try {
        map.resize();
      } catch {
        // ignore
      }
      raf2 = requestAnimationFrame(() => {
        fitToSteps(false);
        hasDoneInitialFitRef.current = true;
      });
    };
    const onLoad = () => {
      raf1 = requestAnimationFrame(run);
    };
    if (map.loaded?.()) onLoad();
    else map.once?.("load", onLoad);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoordinates, steps]);

  /** Re-fit si la taille du conteneur change (utile quand le verso de la carte est dévoilé). */
  useEffect(() => {
    const map = mapRef.current;
    const container = map?.getContainer?.();
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      try {
        m.resize();
      } catch {
        // ignore
      }
      if (hasDoneInitialFitRef.current) fitToSteps(false);
    });
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoordinates, steps]);

  /**
   * Suivi du step actif : on pan doucement vers le step sans jamais modifier le zoom.
   * Le zoom a été fixé une fois par fitBounds — le changer ici cassait le cadrage de l'itinéraire.
   */
  useEffect(() => {
    const map = mapRef.current;
    const step = steps[activeStepIndex];
    if (!map || !step) return;
    if (steps.length <= 1) return;
    try {
      map.panTo([step.lng, step.lat], { duration: 400, essential: true });
    } catch {
      // ignore
    }
  }, [activeStepIndex, steps]);

  useEffect(() => {
    /**
     * Recoloration du style Mapbox — entièrement défensive :
     * sur mobile (iOS surtout), `map.getMap()` peut être indisponible
     * ou lancer si appelé avant que le conteneur soit prêt. On encapsule
     * TOUT en try/catch, y compris la récupération de `mb` — sinon l'erreur
     * remonte au top-level et casse toute la page « Amis ».
     */
    try {
      const map = mapRef.current;
      if (!map) return;
      const mb = map.getMap?.();
      if (!mb) return;

      const applyTheme = () => {
        try {
          const style = mb.getStyle?.();
          if (!style?.layers) return;
          for (const layer of style.layers) {
            try {
              if (layer.type === "background") {
                mb.setPaintProperty(layer.id, "background-color", "#f5f5f5");
              } else if (
                layer.type === "fill" &&
                (layer.id.includes("land") || layer.id.includes("background"))
              ) {
                mb.setPaintProperty(layer.id, "fill-color", "#e8e8e8");
              } else if (layer.type === "fill" && layer.id.includes("water")) {
                mb.setPaintProperty(layer.id, "fill-color", "#d0d0d0");
              } else if (layer.type === "line" && layer.id.includes("admin")) {
                mb.setPaintProperty(layer.id, "line-color", "#999999");
              }
            } catch {
              // layer missing or not ready — ignore
            }
          }
        } catch {
          // style not loaded — ignore
        }
      };

      try {
        if (mb.isStyleLoaded?.()) applyTheme();
        else mb.once?.("style.load", applyTheme);
      } catch {
        // once() may not exist on certain map-gl versions — ignore
      }
    } catch {
      // map wrapper itself threw — ignore, render still works
    }
  }, []);

  if (!mapboxToken) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--color-bg-secondary)] px-4 text-center">
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
      {/**
       * CRUCIAL : chaque `<Source>` a une `key` distincte parce que react-map-gl
       * déclenche un runtime error « source id changed » quand un même nœud
       * React voit son prop `id` muter (les deux branches occupent sinon la
       * MÊME position et React reconcilie en changeant juste le prop id).
       * Avec `key`, chaque branche devient une instance distincte → unmount
       * propre de l'une, mount de l'autre, pas de collision côté Mapbox.
       */}
      {routeData?.segments?.features?.length ? (
        <Source
          key="star-route-segments"
          id="star-route-segments"
          type="geojson"
          data={routeData.segments}
        >
          <Layer
            id="star-route-line"
            type="line"
            paint={{
              "line-color": [
                "case",
                ["==", ["coalesce", ["get", "isFallback"], false], true],
                "#5aa8ff",
                "#e07856",
              ],
              "line-width": [
                "case",
                ["==", ["coalesce", ["get", "isFallback"], false], true],
                2.4,
                3.4,
              ],
              "line-opacity": 0.9,
              "line-dasharray": [
                "case",
                ["==", ["coalesce", ["get", "isFallback"], false], true],
                ["literal", [1.2, 1.2]],
                ["literal", [1, 0]],
              ],
            }}
          />
        </Source>
      ) : fallbackRoute ? (
        <Source
          key="star-route-fallback"
          id="star-route"
          type="geojson"
          data={fallbackRoute}
        >
          <Layer
            id="star-route-line-fallback"
            type="line"
            paint={{
              "line-color": "#e07856",
              "line-width": 3,
              "line-opacity": 0.85,
            }}
          />
        </Source>
      ) : null}

      {steps.map((s, i) => {
        const isActive = i === activeStepIndex;
        return (
          <Marker key={s.slug} longitude={s.lng} latitude={s.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <span
                className={`whitespace-nowrap rounded px-1 font-courier font-bold leading-none transition-all duration-300 ${
                  isActive
                    ? "mb-0.5 text-[10px] text-[var(--color-accent-start)]"
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
                  backgroundColor: "var(--color-accent-start)",
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
