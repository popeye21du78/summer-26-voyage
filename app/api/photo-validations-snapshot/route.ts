import { NextResponse } from "next/server";
import {
  getPhotoValidations,
  listValidatedPhotos,
  type PhotoValidationEntry,
} from "@/lib/maintenance-photo-validations";

/**
 * Une seule réponse par session côté client : toutes les URLs validées maintenance (+ merge fichier/Supabase).
 * Permet d’afficher les photos sans appeler /api/photo-resolve slug par slug.
 */
export async function GET() {
  try {
    const all = await getPhotoValidations();
    const bySlug: Record<string, string[]> = {};
    for (const [slug, entry] of Object.entries(all)) {
      const urls = listValidatedPhotos(entry as PhotoValidationEntry)
        .map((p) => p.url.trim())
        .filter(Boolean);
      if (urls.length) {
        bySlug[slug.trim().toLowerCase()] = urls;
      }
    }
    return NextResponse.json(
      { bySlug, generatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("photo-validations-snapshot:", e);
    return NextResponse.json({ bySlug: {}, error: "snapshot_failed" }, { status: 500 });
  }
}
