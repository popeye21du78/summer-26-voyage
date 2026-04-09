import { NextRequest, NextResponse } from "next/server";
import { getPeage } from "../../../../data/peages";
import type { RouteSegmentFeature } from "../../../../lib/routeSegments";

type StepMin = { id: string; nom: string; coordonnees: { lat: number; lng: number } };

/**
 * POST /api/directions/route-geometry
 * Body: { steps: StepMin[] }
 * Retourne les segments de route avec la géométrie réelle (routes) via Mapbox Directions.
 */
export async function POST(request: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Token Mapbox non configuré" },
      { status: 503 }
    );
  }

  let body: { steps?: StepMin[]; avoidMotorways?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const steps = body.steps;
  const avoidMotorways = body.avoidMotorways !== false;
  if (!Array.isArray(steps) || steps.length < 2) {
    return NextResponse.json(
      { error: "steps doit être un tableau d'au moins 2 étapes" },
      { status: 400 }
    );
  }

  const features: RouteSegmentFeature[] = [];
  const segmentResults: { i: number; coordinates: GeoJSON.Position[] }[] = [];

  const stepsLimited = steps.slice(0, 50);
  const BATCH_SIZE = 6;

  for (let b = 0; b < stepsLimited.length - 1; b += BATCH_SIZE) {
    const batch = [];
    for (let i = b; i < Math.min(b + BATCH_SIZE, stepsLimited.length - 1); i++) {
      const from = stepsLimited[i];
      const to = stepsLimited[i + 1];
      const coords = `${from.coordonnees.lng},${from.coordonnees.lat};${to.coordonnees.lng},${to.coordonnees.lat}`;
      const exclude = avoidMotorways ? "&exclude=motorway" : "";
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=geojson${exclude}`;
      batch.push({ i, from, to, url });
    }

    const results = await Promise.all(
      batch.map(async ({ i, from, to, url }) => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) return { i, from, to, route: null };
          const data = (await res.json()) as {
            code?: string;
            routes?: Array<{
              geometry?: { coordinates?: [number, number][]; type?: string };
              distance?: number;
              duration?: number;
            }>;
          };
          const route = data.code === "Ok" && data.routes?.[0]
            ? data.routes[0]
            : null;
          return { i, from, to, route };
        } catch {
          return { i, from, to, route: null };
        }
      })
    );

    for (const { i, from, to, route } of results) {
      if (!route?.geometry?.coordinates?.length) {
        segmentResults.push({
          i,
          coordinates: [
            [from.coordonnees.lng, from.coordonnees.lat],
            [to.coordonnees.lng, to.coordonnees.lat],
          ],
        });
        continue;
      }

      const coordinates = route.geometry!.coordinates as GeoJSON.Position[];
      const distanceM = route.distance ?? 0;
      const durationS = route.duration ?? 0;
      const distanceKm = Math.round((distanceM / 1000) * 10) / 10;
      const durationMin = Math.round(durationS / 60);
      const tollCost = getPeage(from.id, to.id);

      features.push({
        type: "Feature",
        id: `segment-${from.id}-${to.id}`,
        geometry: { type: "LineString", coordinates },
        properties: {
          segmentId: `${from.id}-${to.id}`,
          fromId: from.id,
          toId: to.id,
          fromName: from.nom,
          toName: to.nom,
          distanceKm,
          durationMin,
          tollCost,
        },
      });
      segmentResults.push({ i, coordinates });
    }
  }

  const allCoords: GeoJSON.Position[] = [];
  segmentResults.sort((a, b) => a.i - b.i);
  for (let j = 0; j < segmentResults.length; j++) {
    const { coordinates } = segmentResults[j];
    if (j === 0) {
      allCoords.push(...coordinates);
    } else {
      allCoords.push(...coordinates.slice(1));
    }
  }

  const segments: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const singleLine: GeoJSON.FeatureCollection =
    allCoords.length >= 2
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: allCoords,
              },
              properties: {},
            },
          ],
        }
      : { type: "FeatureCollection", features: [] };

  return NextResponse.json({ segments, singleLine });
}
