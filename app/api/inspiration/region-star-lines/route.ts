import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import { mapRegionById } from "@/lib/inspiration-map-regions-config";
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
  const bySlug = new Map<string, [number, number]>();
  for (const l of lieux) {
    if (typeof l.lat === "number" && typeof l.lng === "number" && l.slug) {
      bySlug.set(l.slug, [l.lng, l.lat]);
    }
  }

  const features: FeatureCollection["features"] = [];
  for (const it of editorial.itineraries) {
    const coords = it.steps
      .map((s) => bySlug.get(s.slug))
      .filter((c): c is [number, number] => !!c);
    if (coords.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { id: it.itinerarySlug, hl: 0 },
      geometry: { type: "LineString", coordinates: coords } satisfies LineString,
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
