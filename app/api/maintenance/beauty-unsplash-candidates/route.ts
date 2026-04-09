import { NextRequest, NextResponse } from "next/server";
import { getBeautyMaintenanceRow } from "@/lib/top-beauty-queue";
import { getPhotoQueries } from "@/lib/photo-queries";
import { fetchUnsplashPhotosWindow } from "@/lib/unsplash";

const WINDOW = 5;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const slug = sp.get("slug")?.trim().toLowerCase();
    const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);

    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const row = getBeautyMaintenanceRow(slug);
    if (!row) {
      return NextResponse.json({ error: "Lieu hors top 200 / hors liste PBVF" }, { status: 404 });
    }

    const queries = getPhotoQueries(row.nom, row.slug);
    const t0 = Date.now();
    const r = await fetchUnsplashPhotosWindow({
      queries: queries.length ? queries : [`${row.nom} France`],
      offset,
      windowSize: WINDOW,
      cityName: row.nom,
      stepId: row.slug,
    });
    const ms = Date.now() - t0;

    return NextResponse.json({
      slug: row.slug,
      nom: row.nom,
      rank: row.rank,
      query: r.query,
      offset,
      windowSize: WINDOW,
      totalCandidates: r.totalCandidates,
      hasMore: r.hasMore,
      photos: r.photos,
      fetchMs: ms,
    });
  } catch (e) {
    console.error("beauty-unsplash-candidates:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
