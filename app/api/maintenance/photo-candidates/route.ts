import { NextRequest, NextResponse } from "next/server";
import { loadMaintenancePhotoQueue, loadBigCitiesForWikiTest } from "@/lib/maintenance-photo-queue";
import {
  loadTop200BeautyQueue,
  loadPbvfBeautyQueue,
  loadAllPatrimoineBeautyQueue,
} from "@/lib/top-beauty-queue";
import { fetchCommonsPhotosWindow } from "@/lib/commons-api";
import { buildCommonsSearchQueryFromNom } from "@/lib/maintenance-commons-query";

const WINDOW = 5;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const slug = sp.get("slug")?.trim().toLowerCase();
    const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);
    const mode = sp.get("mode") ?? "queue"; // queue | big_cities | beauty_top200
    const minWidthRaw = sp.get("minWidth");
    const minWidth =
      minWidthRaw === "" || minWidthRaw === null
        ? 800
        : Math.max(400, Math.min(2000, parseInt(minWidthRaw, 10) || 800));

    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const list =
      mode === "big_cities"
        ? loadBigCitiesForWikiTest(500)
        : mode === "beauty_top200"
          ? loadTop200BeautyQueue()
          : mode === "beauty_pbvf"
            ? loadPbvfBeautyQueue()
            : mode === "beauty_all"
              ? loadAllPatrimoineBeautyQueue()
              : loadMaintenancePhotoQueue();
    const lieu = list.find((l) => l.slug === slug);
    if (!lieu) {
      return NextResponse.json({ error: "Lieu introuvable dans cette file" }, { status: 404 });
    }

    const query = buildCommonsSearchQueryFromNom(lieu.nom);
    const t0 = Date.now();
    const { photos, totalCandidates, query: qUsed } = await fetchCommonsPhotosWindow(
      query,
      offset,
      WINDOW,
      { minWidth }
    );
    const ms = Date.now() - t0;

    return NextResponse.json({
      slug: lieu.slug,
      nom: lieu.nom,
      departement: lieu.departement,
      query: qUsed,
      offset,
      windowSize: WINDOW,
      totalCandidates,
      hasMore: offset + WINDOW < totalCandidates,
      photos,
      fetchMs: ms,
    });
  } catch (e) {
    console.error("maintenance photo-candidates:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
