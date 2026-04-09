import { NextRequest, NextResponse } from "next/server";
import {
  loadTop200BeautyQueue,
  loadPbvfBeautyQueue,
  loadAllPatrimoineBeautyQueue,
} from "@/lib/top-beauty-queue";
import { getBeauty200Entry, getBeautyCurationStats } from "@/lib/maintenance-beauty-validations";

function defaultPhaseForEntry(slug: string): "unsplash" | "commons" {
  const e = getBeauty200Entry(slug);
  if (!e || e.skipped) return "unsplash";
  const u = e.unsplashPhotos?.length ?? 0;
  const c = e.commonsPhotos?.length ?? 0;
  if (u > 0) return "unsplash";
  if (e.unsplashPassedToCommons || c > 0) return "commons";
  return "unsplash";
}

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope") ?? "top200";
    const rows =
      scope === "pbvf"
        ? loadPbvfBeautyQueue()
        : scope === "all"
          ? loadAllPatrimoineBeautyQueue()
          : loadTop200BeautyQueue();
    const enriched = rows.map((row) => {
      const e = getBeauty200Entry(row.slug);
      const unsplashN = e?.unsplashPhotos?.length ?? 0;
      const commonsN = e?.commonsPhotos?.length ?? 0;
      return {
        ...row,
        skipped: e?.skipped ?? false,
        unsplashValidatedCount: unsplashN,
        commonsValidatedCount: commonsN,
        unsplashPassedToCommons: e?.unsplashPassedToCommons ?? false,
        defaultPhase: defaultPhaseForEntry(row.slug),
        validatedUnsplashUrls: e?.unsplashPhotos?.map((p) => p.url) ?? [],
        validatedCommonsUrls: e?.commonsPhotos?.map((p) => p.url) ?? [],
      };
    });
    return NextResponse.json({
      scope: scope === "pbvf" ? "pbvf" : scope === "all" ? "all" : "top200",
      total: enriched.length,
      limit: rows.length,
      items: enriched,
      stats: getBeautyCurationStats(),
    });
  } catch (e) {
    console.error("beauty-queue:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
