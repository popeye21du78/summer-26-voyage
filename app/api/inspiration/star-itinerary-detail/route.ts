import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import {
  orderedStepsForItinerary,
  buildLineStringFromResolved,
} from "@/lib/inspiration/star-itinerary-geo";
import type { StarItinerariesEditorialFile } from "@/types/star-itineraries-editorial";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const regionId = url.searchParams.get("regionId")?.trim();

  if (!slug || !regionId) {
    return NextResponse.json(
      { error: "slug et regionId requis" },
      { status: 400 }
    );
  }

  const path = join(
    process.cwd(),
    "content/inspiration/star-itineraries-editorial",
    `${regionId}.json`
  );

  let editorial: StarItinerariesEditorialFile;
  try {
    editorial = JSON.parse(
      readFileSync(path, "utf8")
    ) as StarItinerariesEditorialFile;
  } catch {
    return NextResponse.json({ error: "region introuvable" }, { status: 404 });
  }

  const itinerary = editorial.itineraries?.find(
    (it) => it.itinerarySlug === slug
  );
  if (!itinerary) {
    return NextResponse.json(
      { error: "itineraire introuvable" },
      { status: 404 }
    );
  }

  const lieux = filterLieuxByMapRegion(
    (lieuxRaw as { lieux: LieuCentralRow[] }).lieux ?? [],
    regionId
  );

  const resolvedSteps = orderedStepsForItinerary(itinerary, lieux);
  const geometry = buildLineStringFromResolved(resolvedSteps);

  return NextResponse.json({
    itinerary,
    resolvedSteps,
    geometry,
  });
}
