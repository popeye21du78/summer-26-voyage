import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";

export type DrivingRouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: { type: "LineString"; coordinates: [number, number][] } | null;
  legs: Array<{ distanceKm: number; durationMin: number }>;
  /** `true` si le tracé exclut les autoroutes (sinon repli sur l’itinéraire standard). */
  avoidMotorways?: boolean;
  profile?: MapboxRouteProfile;
};

/**
 * Récupère l’itinéraire Mapbox (géométrie + jambes) pour une chaîne de waypoints.
 * Voiture : évite les autoroutes quand possible (`noMotorway`).
 * Vélo : profil Mapbox `cycling`.
 */
export async function fetchVoyageRoute(
  waypoints: Array<{ lat: number; lng: number }>,
  options?: { excludeMotorway?: boolean; profile?: MapboxRouteProfile }
): Promise<DrivingRouteResult | null> {
  const valid = waypoints.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180
  );
  if (valid.length < 2) return null;
  const w = valid.map((p) => `${p.lng},${p.lat}`).join(";");
  const profile: MapboxRouteProfile = options?.profile ?? "driving";
  const qs = new URLSearchParams();
  qs.set("waypoints", w);
  qs.set("profile", profile);
  if (profile === "driving") {
    const ex = options?.excludeMotorway !== false;
    if (ex) qs.set("noMotorway", "1");
    else qs.set("noMotorway", "0");
  }
  const res = await fetch(`/api/directions/geometry?${qs.toString()}`);
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<DrivingRouteResult> & {
    error?: string;
    avoidMotorways?: boolean;
  };
  if (data.error || typeof data.distanceKm !== "number") return null;
  return {
    distanceKm: data.distanceKm,
    durationMin: data.durationMin ?? 0,
    geometry: data.geometry ?? null,
    legs: Array.isArray(data.legs) ? data.legs : [],
    avoidMotorways: data.avoidMotorways,
    profile: data.profile ?? profile,
  };
}

/** Délai max. avant d’abandonner le tracé (création voyage) — on enregistre quand même en local. */
const ROUTE_SAVE_TIMEOUT_MS = 18_000;

/**
 * Même logique que `fetchVoyageRoute`, mais ne bloque jamais indéfiniment
 * (timeout) et n’exécute jamais le flux de création (erreur réseau, etc.).
 */
export async function fetchVoyageRouteForSave(
  waypoints: Array<{ lat: number; lng: number }>,
  options?: { excludeMotorway?: boolean; profile?: MapboxRouteProfile }
): Promise<DrivingRouteResult | null> {
  const valid = waypoints.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180
  );
  if (valid.length < 2) return null;
  try {
    const pending = fetchVoyageRoute(valid, options);
    const timeout = new Promise<null>((r) => {
      setTimeout(() => r(null), ROUTE_SAVE_TIMEOUT_MS);
    });
    return await Promise.race([pending, timeout]);
  } catch {
    return null;
  }
}

export async function fetchDrivingRoute(
  waypoints: Array<{ lat: number; lng: number }>,
  options?: { excludeMotorway?: boolean }
): Promise<DrivingRouteResult | null> {
  return fetchVoyageRoute(waypoints, { ...options, profile: "driving" });
}
