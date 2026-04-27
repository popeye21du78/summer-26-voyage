export type DrivingRouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: { type: "LineString"; coordinates: [number, number][] } | null;
  legs: Array<{ distanceKm: number; durationMin: number }>;
  /** `true` si le tracé exclut les autoroutes (sinon repli sur l’itinéraire standard). */
  avoidMotorways?: boolean;
};

/**
 * Récupère l’itinéraire routier Mapbox (géométrie + jambes) pour une chaîne de waypoints.
 * Par défaut : tente d’**éviter les autoroutes** (`noMotorway` côté API), avec repli si besoin.
 */
export async function fetchDrivingRoute(
  waypoints: Array<{ lat: number; lng: number }>,
  options?: { excludeMotorway?: boolean }
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
  const ex = options?.excludeMotorway !== false;
  const qs = new URLSearchParams();
  qs.set("waypoints", w);
  if (ex) qs.set("noMotorway", "1");
  else qs.set("noMotorway", "0");
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
  };
}
