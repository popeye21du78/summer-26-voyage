import { NextRequest } from "next/server";
import { getPublicPhotoPick } from "@/lib/public-photo-url";

/**
 * GET /api/photo-resolve?slug=&stepId=&photoIndex=0
 * Retourne une URL déjà connue (Beauty 200 ou photo-validations) — ultra rapide, sans Wikipedia/Unsplash.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  const stepId = req.nextUrl.searchParams.get("stepId")?.trim() ?? "";
  const photoIndex = Math.max(
    0,
    parseInt(req.nextUrl.searchParams.get("photoIndex") ?? "0", 10) || 0
  );

  const key = slug || stepId;
  if (!key) {
    return Response.json(
      { error: "slug ou stepId requis", url: null, total: 0, source: null },
      { status: 400 }
    );
  }

  const pick = await getPublicPhotoPick(slug || stepId, stepId || undefined, photoIndex);
  if (!pick) {
    return Response.json({ url: null, total: 0, source: null });
  }

  /** Validations = URL stable ; cache CDN/Vercel plus long pour éviter un aller-retour API à chaque vue. */
  const cacheControl =
    pick.source === "maintenance_validated"
      ? "public, s-maxage=86400, stale-while-revalidate=604800"
      : "public, s-maxage=3600, stale-while-revalidate=86400";

  return Response.json(pick, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}
