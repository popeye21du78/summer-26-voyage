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

  let body: { steps?: StepMin[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const steps = body.steps;
  if (!Array.isArray(steps) || steps.length < 2) {
    return NextResponse.json(
      { error: "steps doit être un tableau d'au moins 2 étapes" },
      { status: 400 }
    );
  }

  const features: RouteSegmentFeature[] = [];
  const allCoords: GeoJSON.Position[] = [];

  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const coords = `${from.coordonnees.lng},${from.coordonnees.lat};${to.coordonnees.lng},${to.coordonnees.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Mapbox Directions segment:", res.status, await res.text());
      continue;
    }

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        geometry?: { coordinates?: [number, number][]; type?: string };
        distance?: number;
        duration?: number;
      }>;
    };

    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
      continue;
    }

    const route = data.routes[0];
    const coordinates = route.geometry!.coordinates as GeoJSON.Position[];
    const distanceM = route.distance ?? 0;
    const durationS = route.duration ?? 0;
    const distanceKm = Math.round((distanceM / 1000) * 10) / 10;
    const durationMin = Math.round(durationS / 60);
    const tollCost = getPeage(from.id, to.id);

    features.push({
      type: "Feature",
      id: `segment-${from.id}-${to.id}`,
      geometry: {
        type: "LineString",
        coordinates,
      },
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

    if (i === 0) {
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
