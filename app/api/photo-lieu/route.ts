/**
 * Photo Unsplash pour un lieu (carte-villes, page ville).
 * GET /api/photo-lieu?ville=Granville
 * Pas de stepId requis.
 */
import { NextRequest } from "next/server";
import { fetchPhotoForCity } from "../../../lib/unsplash";

export async function GET(req: NextRequest) {
  const ville = req.nextUrl.searchParams.get("ville");
  if (!ville?.trim()) {
    return Response.json({ error: "Paramètre ville requis" }, { status: 400 });
  }

  const result = await fetchPhotoForCity(ville.trim());
  if (!result) {
    return Response.json({ error: "Aucune photo trouvée" }, { status: 404 });
  }

  return Response.json({ url: result.url, alt: result.alt, credit: result.credit });
}
