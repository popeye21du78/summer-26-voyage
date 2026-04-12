import { NextResponse } from "next/server";
import { listCuratedPhotoUrlsForRegion } from "@/lib/inspiration/curated-pool-server";

export const dynamic = "force-dynamic";

/**
 * GET ?regionId=…&slugs=slug1,slug2 (optionnel) — pool de photos validées pour tirage persistant côté client.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionId = url.searchParams.get("regionId")?.trim();
  const slugsParam = url.searchParams.get("slugs")?.trim();
  if (!regionId) {
    return NextResponse.json({ error: "regionId requis" }, { status: 400 });
  }
  const slugFilter =
    slugsParam && slugsParam.length > 0
      ? new Set(
          slugsParam
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        )
      : undefined;
  const urls = listCuratedPhotoUrlsForRegion(regionId, slugFilter);
  return NextResponse.json({ urls }, { headers: { "Cache-Control": "no-store" } });
}
