import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import { mapRegionById } from "@/lib/inspiration-map-regions-config";
import { fetchMergedDrivingCoordinates } from "@/lib/mapbox-driving-line";
import { curatedPhotoUrlForSlug, mapLieuRowToIconKey } from "@/lib/inspiration/lieu-icon-and-photo";
import {
  buildLineStringFromResolved,
  orderedStepsForItinerary,
  toDrivingRouteSteps,
} from "@/lib/inspiration/star-itinerary-geo";
import type { FeatureCollection, LineString } from "geojson";
import type { StarItinerariesEditorialFile } from "@/types/star-itineraries-editorial";
import type { StarLineRouteResponse } from "@/types/inspiration-star-map";

export const dynamic = "force-dynamic";

/**
 * Un seul itinéraire éditorial : tracé routier (Mapbox) + ordre optimisé (haversine).
 * GET ?regionId=bretagne&slug=mon-itineraire
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionId = url.searchParams.get("regionId")?.trim();
  const slug = url.searchParams.get("slug")?.trim();
  if (!regionId || !mapRegionById(regionId) || !slug) {
    return NextResponse.json({ error: "regionId et slug requis" }, { status: 400 });
  }

  const path = join(
    process.cwd(),
    "content/inspiration/star-itineraries-editorial",
    `${regionId}.json`
  );

  let editorial: StarItinerariesEditorialFile;
  try {
    editorial = JSON.parse(readFileSync(path, "utf8")) as StarItinerariesEditorialFile;
  } catch {
    return NextResponse.json({ line: emptyFc(), stops: [] } satisfies StarLineRouteResponse, {
      status: 404,
    });
  }

  const it = editorial.itineraries?.find((x) => x.itinerarySlug === slug);
  if (!it) {
    return NextResponse.json({ line: emptyFc(), stops: [] } satisfies StarLineRouteResponse, {
      status: 404,
    });
  }

  const lieux = filterLieuxByMapRegion(
    (lieuxRaw as { lieux: LieuCentralRow[] }).lieux ?? [],
    regionId
  );

  const ordered = orderedStepsForItinerary(it, lieux);
  if (ordered.length < 2) {
    return NextResponse.json({ line: emptyFc(), stops: [] } satisfies StarLineRouteResponse);
  }

  const drivingSteps = toDrivingRouteSteps(ordered);
  const coords = await fetchMergedDrivingCoordinates(drivingSteps);

  let geometry: LineString;
  if (coords && coords.length >= 2) {
    geometry = { type: "LineString", coordinates: coords };
  } else {
    const fallback = buildLineStringFromResolved(ordered);
    if (!fallback) {
      return NextResponse.json(emptyFc());
    }
    geometry = fallback;
  }

  const fc: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: it.itinerarySlug,
          hl: 1,
          geometrySource: coords ? "mapbox-driving" : "straight-fallback",
        },
        geometry,
      },
    ],
  };

  const bySlug = new Map(lieux.map((l) => [l.slug, l]));
  const stops = ordered.map((s, i) => ({
    slug: s.slug,
    nom: s.nom,
    lat: s.lat,
    lng: s.lng,
    order: i + 1,
    photoUrl: curatedPhotoUrlForSlug(s.slug),
    iconKey: mapLieuRowToIconKey(bySlug.get(s.slug)),
  }));

  const payload: StarLineRouteResponse = { line: fc, stops };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

function emptyFc(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
