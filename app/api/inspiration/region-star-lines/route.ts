import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import { mapRegionById } from "@/lib/inspiration-map-regions-config";
import {
  buildLineStringFromResolved,
  orderedStepsForItinerary,
} from "@/lib/inspiration/star-itinerary-geo";
import type { FeatureCollection, LineString } from "geojson";
import type { StarItinerariesEditorialFile } from "@/types/star-itineraries-editorial";

export const dynamic = "force-dynamic";

/**
 * Lignes GeoJSON pour les itinéraires éditoriaux (slugs → coordonnées lieux-central).
 * GET ?regionId=bretagne
 */
export async function GET(req: Request) {
  const regionId = new URL(req.url).searchParams.get("regionId")?.trim();
  if (!regionId || !mapRegionById(regionId)) {
    return NextResponse.json({ error: "regionId invalide" }, { status: 400 });
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
    return NextResponse.json(emptyFc());
  }

  if (!editorial.itineraries?.length) {
    return NextResponse.json(emptyFc());
  }

  const lieux = filterLieuxByMapRegion(
    (lieuxRaw as { lieux: LieuCentralRow[] }).lieux ?? [],
    regionId
  );

  const features: FeatureCollection["features"] = [];
  for (const it of editorial.itineraries) {
    const ordered = orderedStepsForItinerary(it, lieux);
    const geom = buildLineStringFromResolved(ordered);
    if (!geom) continue;
    features.push({
      type: "Feature",
      properties: { id: it.itinerarySlug, hl: 0 },
      geometry: geom satisfies LineString,
    });
  }

  const fc: FeatureCollection = { type: "FeatureCollection", features };
  return NextResponse.json(fc, {
    headers: { "Cache-Control": "no-store" },
  });
}

function emptyFc(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
