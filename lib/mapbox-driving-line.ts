import type { Position } from "geojson";

export type DrivingRouteStep = {
  id: string;
  nom: string;
  lat: number;
  lng: number;
};

/**
 * Enchaîne les tronçons Mapbox Driving (routes réelles) dans l’ordre des étapes.
 * Retourne une seule polyligne [lng, lat] ou null si échec total.
 */
export async function fetchMergedDrivingCoordinates(
  steps: DrivingRouteStep[],
  options?: { avoidMotorways?: boolean; accessToken?: string }
): Promise<Position[] | null> {
  const token = options?.accessToken ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || steps.length < 2) return null;

  const avoidMotorways = options?.avoidMotorways !== false;
  const stepsLimited = steps.slice(0, 50);
  const BATCH_SIZE = 6;
  const segmentResults: { i: number; coordinates: Position[] }[] = [];

  for (let b = 0; b < stepsLimited.length - 1; b += BATCH_SIZE) {
    const batch: { i: number; from: DrivingRouteStep; to: DrivingRouteStep; url: string }[] = [];
    for (let i = b; i < Math.min(b + BATCH_SIZE, stepsLimited.length - 1); i++) {
      const from = stepsLimited[i];
      const to = stepsLimited[i + 1];
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const exclude = avoidMotorways ? "&exclude=motorway" : "";
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=geojson${exclude}`;
      batch.push({ i, from, to, url });
    }

    const results = await Promise.all(
      batch.map(async ({ i, from, to, url }) => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) return { i, from, to, route: null as { geometry?: { coordinates?: Position[] } } | null };
          const data = (await res.json()) as {
            code?: string;
            routes?: Array<{ geometry?: { coordinates?: Position[] } }>;
          };
          const route = data.code === "Ok" && data.routes?.[0] ? data.routes[0] : null;
          return { i, from, to, route };
        } catch {
          return { i, from, to, route: null };
        }
      })
    );

    for (const { i, from, to, route } of results) {
      const coords = route?.geometry?.coordinates;
      if (!coords?.length) {
        segmentResults.push({
          i,
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        });
        continue;
      }
      segmentResults.push({ i, coordinates: coords });
    }
  }

  segmentResults.sort((a, b) => a.i - b.i);
  const allCoords: Position[] = [];
  for (let j = 0; j < segmentResults.length; j++) {
    const { coordinates } = segmentResults[j];
    if (j === 0) {
      allCoords.push(...coordinates);
    } else {
      allCoords.push(...coordinates.slice(1));
    }
  }

  return allCoords.length >= 2 ? allCoords : null;
}
