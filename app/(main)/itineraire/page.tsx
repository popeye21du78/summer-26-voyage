"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Loader2, MapPin, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

const MapGL = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.default),
  { ssr: false }
);
const MarkerGL = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.Marker),
  { ssr: false }
);
const SourceGL = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.Source),
  { ssr: false }
);
const LayerGL = dynamic(
  () => import("react-map-gl/mapbox").then((m) => m.Layer),
  { ssr: false }
);

/* ── Types ── */
interface ItinPoint {
  nom: string;
  lat: number;
  lng: number;
  famille: string;
  score: number;
  departement: string;
}
interface ItinDay {
  day: number;
  isStayDay: boolean;
  points: ItinPoint[];
  sleepAt: { nom: string; lat: number; lng: number } | null;
  sleepNights: number;
}
interface ItinResult {
  days: ItinDay[];
  totalDistanceKm: number;
  clustersCount: number;
  totalVisits: number;
  from: string;
  to: string;
}

const DAY_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6",
  "#1abc9c", "#e91e63", "#ff9800", "#00bcd4", "#8bc34a", "#ff5722",
];

const FAMILLE_ICONS: Record<string, string> = {
  ville: "🏙", village: "🏘", chateau: "🏰", plage: "🏖",
  rando: "🥾", site_naturel: "🌿", musee: "🎨",
  patrimoine: "⛪", abbaye: "⛪", autre: "📍",
};

const PRESETS = [
  { label: "Bordeaux → Marseille", from: "Bordeaux", to: "Marseille", nights: 7 },
  { label: "Paris → Nice", from: "Paris", to: "Nice", nights: 10 },
  { label: "Nantes → Toulouse", from: "Nantes", to: "Toulouse", nights: 5 },
  { label: "Lyon → Brest", from: "Lyon", to: "Brest", nights: 8 },
];

const FRANCE_BOUNDS: [[number, number], [number, number]] = [[-5.5, 41], [9.5, 51.5]];

export default function ItinerairePage() {
  const [from, setFrom] = useState("Bordeaux");
  const [to, setTo] = useState("Marseille");
  const [nights, setNights] = useState(7);
  const [rythme, setRythme] = useState<"cool" | "normal" | "intense">("normal");
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [result, setResult] = useState<ItinResult | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState("");
  const mapRef = useRef<any>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    setRouteGeoJSON(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, nights, rythme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, nights, rythme]);

  // Fetch real road routes from Mapbox Directions once we have itinerary
  useEffect(() => {
    if (!result || !token) return;

    const orderedPoints: { id: string; nom: string; coordonnees: { lat: number; lng: number } }[] = [];
    for (const day of result.days) {
      if (day.isStayDay) continue;
      for (const p of day.points) {
        const id = p.nom.toLowerCase().replace(/\s+/g, "-");
        if (!orderedPoints.find((op) => op.id === id)) {
          orderedPoints.push({ id, nom: p.nom, coordonnees: { lat: p.lat, lng: p.lng } });
        }
      }
    }

    if (orderedPoints.length < 2) return;

    setLoadingRoutes(true);
    fetch("/api/directions/route-geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: orderedPoints }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Route API"))))
      .then((data) => {
        if (data.singleLine) setRouteGeoJSON(data.singleLine);
      })
      .catch(() => {
        // Fallback: build straight-line GeoJSON
        const coords = orderedPoints.map((p) => [p.coordonnees.lng, p.coordonnees.lat]);
        setRouteGeoJSON({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }],
        });
      })
      .finally(() => setLoadingRoutes(false));
  }, [result, token]);

  // Fit map bounds when result changes
  useEffect(() => {
    if (!result || !mapRef.current) return;
    const allCoords: [number, number][] = [];
    for (const day of result.days) {
      for (const p of day.points) allCoords.push([p.lng, p.lat]);
    }
    if (allCoords.length < 2) return;

    const lngs = allCoords.map((c) => c[0]);
    const lats = allCoords.map((c) => c[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    try {
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 1200 });
    } catch {}
  }, [result, routeGeoJSON]);

  // Build markers from result
  const markers = useMemo(() => {
    if (!result) return [];
    const m: { lat: number; lng: number; nom: string; famille: string; dayNum: number; isSleep: boolean; isStay: boolean; sleepNights: number }[] = [];
    for (const day of result.days) {
      for (const p of day.points) {
        const isSleep = !!(day.sleepAt && p.nom === day.sleepAt.nom);
        m.push({ lat: p.lat, lng: p.lng, nom: p.nom, famille: p.famille, dayNum: day.day, isSleep, isStay: day.isStayDay, sleepNights: day.sleepNights });
      }
    }
    return m;
  }, [result]);

  if (!token) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-[#333]">Token Mapbox manquant. Ajoutez <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> dans <code>.env.local</code>.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Route className="h-6 w-6 text-[#A55734]" />
        <h1 className="text-2xl font-light text-[#333]">Générateur d&apos;itinéraire</h1>
      </div>

      {/* Controls */}
      <div className="mb-6 rounded-lg border border-[#A55734]/20 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#333]/60">Départ</label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded border border-[#A55734]/20 px-3 py-2 text-sm focus:border-[#A55734] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#333]/60">Arrivée</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded border border-[#A55734]/20 px-3 py-2 text-sm focus:border-[#A55734] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#333]/60">Nuits</label>
            <input
              type="number"
              min={1}
              max={30}
              value={nights}
              onChange={(e) => setNights(Number(e.target.value))}
              className="w-full rounded border border-[#A55734]/20 px-3 py-2 text-sm focus:border-[#A55734] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#333]/60">Rythme</label>
            <select
              value={rythme}
              onChange={(e) => setRythme(e.target.value as any)}
              className="w-full rounded border border-[#A55734]/20 px-3 py-2 text-sm focus:border-[#A55734] focus:outline-none"
            >
              <option value="cool">Cool (2–3 visites/jour)</option>
              <option value="normal">Normal (3–4 visites/jour)</option>
              <option value="intense">Intense (4–5 visites/jour)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={loading || !from}
              className="flex w-full items-center justify-center gap-2 rounded bg-[#A55734] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8a4629] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {loading ? "Génération..." : "Générer"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.from); setTo(p.to); setNights(p.nights); }}
              className="rounded-full border border-[#A55734]/20 px-3 py-1 text-xs text-[#A55734] transition hover:bg-[#A55734]/10"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="relative h-[600px] w-full overflow-hidden rounded-lg border border-[#A55734]/20">
            {loadingRoutes && (
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-[#A55734] shadow">
                <Loader2 className="h-3 w-3 animate-spin" /> Tracé des routes...
              </div>
            )}
            <MapGL
              ref={mapRef}
              mapboxAccessToken={token}
              initialViewState={{ longitude: 2.5, latitude: 46.5, zoom: 5.5 }}
              minZoom={5}
              maxZoom={14}
              maxBounds={FRANCE_BOUNDS}
              mapStyle="mapbox://styles/mapbox/light-v11"
              style={{ width: "100%", height: "100%" }}
              attributionControl={true}
            >
              {/* Route line */}
              {routeGeoJSON && (
                <>
                  <SourceGL id="itin-route" type="geojson" data={routeGeoJSON} lineMetrics>
                    <LayerGL
                      id="itin-route-line"
                      type="line"
                      paint={{
                        "line-color": "#A55734",
                        "line-width": 4,
                        "line-opacity": 0.7,
                      }}
                    />
                    <LayerGL
                      id="itin-route-glow"
                      type="line"
                      paint={{
                        "line-color": "#A55734",
                        "line-width": 8,
                        "line-opacity": 0.15,
                      }}
                    />
                  </SourceGL>
                </>
              )}

              {/* Markers */}
              {markers.map((m, i) => {
                const color = DAY_COLORS[(m.dayNum - 1) % DAY_COLORS.length];
                if (m.isSleep) {
                  return (
                    <MarkerGL key={`sleep-${i}`} longitude={m.lng} latitude={m.lat} anchor="center">
                      <div
                        className="flex items-center justify-center rounded-full border-[3px] border-white shadow-md"
                        style={{ width: 28, height: 28, background: "#2c3e50" }}
                        title={m.nom + " — Nuit"}
                      >
                        <span className="text-xs font-bold text-white">{m.sleepNights}</span>
                      </div>
                    </MarkerGL>
                  );
                }
                if (m.isStay) return null;
                return (
                  <MarkerGL key={`visit-${i}`} longitude={m.lng} latitude={m.lat} anchor="center">
                    <div
                      className="rounded-full border-2 border-white shadow"
                      style={{ width: 14, height: 14, background: color }}
                      title={m.nom + " — Jour " + m.dayNum}
                    />
                  </MarkerGL>
                );
              })}
            </MapGL>
          </div>
        </div>

        {/* Day panel */}
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-[#A55734]/20 bg-white">
          {!result ? (
            <div className="flex h-full items-center justify-center p-8 text-sm text-[#333]/40">
              Lance une génération pour voir l&apos;itinéraire
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4 rounded-lg bg-[#FAF4F0] p-3 text-sm">
                <div className="font-medium text-[#A55734]">{result.from} → {result.to}</div>
                <div className="mt-1 text-[#333]/70">
                  {result.days.length} jours · ~{result.totalDistanceKm} km · {result.totalVisits} visites · {result.clustersCount} zones
                </div>
              </div>

              {result.days.map((day) => {
                const color = DAY_COLORS[(day.day - 1) % DAY_COLORS.length];
                return (
                  <DayCard key={day.day} day={day} color={color} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DayCard({ day, color }: { day: ItinDay; color: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="mb-1 flex w-full items-center gap-2 text-left"
      >
        <div className="h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold text-[#333]">
          Jour {day.day}
          {day.isStayDay && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">SÉJOUR</span>
          )}
        </span>
        <ChevronDown className={`ml-auto h-3 w-3 text-[#333]/40 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {day.isStayDay ? (
            <div className="ml-5 text-xs text-[#333]/60">
              Journée libre à {day.sleepAt?.nom}
            </div>
          ) : (
            <div className="ml-5 space-y-0.5">
              {day.points.map((p, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-[#333]/80">
                  <span>{FAMILLE_ICONS[p.famille] ?? "📍"}</span>
                  <span>{p.nom}</span>
                  <span className="text-[10px] text-[#333]/40">({p.departement})</span>
                </div>
              ))}
            </div>
          )}

          {day.sleepAt && (
            <div className="ml-5 mt-0.5 text-xs text-[#A55734]">
              🛏 {day.sleepAt.nom} ({day.sleepNights}n)
            </div>
          )}
          {!day.sleepAt && !day.isStayDay && (
            <div className="ml-5 mt-0.5 text-xs text-[#333]/40">→ fin du voyage</div>
          )}
        </>
      )}
    </div>
  );
}
