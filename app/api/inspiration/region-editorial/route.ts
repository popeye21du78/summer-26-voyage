import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { mapRegionById } from "@/lib/inspiration-map-regions-config";
import type { StarItinerariesEditorialFile } from "@/types/star-itineraries-editorial";

export const dynamic = "force-dynamic";

/**
 * Contenu éditorial brut (JSON) lu sur disque — toujours à jour après sauvegarde du fichier.
 * GET ?regionId=bourgogne
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

  try {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as StarItinerariesEditorialFile;
    if (!data.itineraries || !Array.isArray(data.itineraries)) {
      return NextResponse.json({ itineraries: [] } satisfies StarItinerariesEditorialFile, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ itineraries: [] } satisfies StarItinerariesEditorialFile, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
