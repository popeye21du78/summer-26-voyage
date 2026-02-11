import { NextRequest } from "next/server";
import { getItinerary, updateItineraryPhotoUrl } from "../../../lib/itinerary-supabase";
import { fetchPhotoForCity } from "../../../lib/unsplash";

/**
 * GET /api/photo-ville?stepId=X&ville=Y&refresh=1&page=2
 * - refresh=1 : ignore le cache, prend un autre résultat Unsplash (page 2 à 5)
 * - page : index de page Unsplash (pour varier les résultats)
 */
export async function GET(req: NextRequest) {
  const stepId = req.nextUrl.searchParams.get("stepId");
  const ville = req.nextUrl.searchParams.get("ville");
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const pageParam = req.nextUrl.searchParams.get("page");
  const page = pageParam ? Math.min(10, Math.max(1, parseInt(pageParam, 10) || 2)) : 1;

  if (!stepId || !ville) {
    return Response.json({ error: "stepId et ville requis" }, { status: 400 });
  }

  if (!refresh) {
    const rows = await getItinerary();
    const row = rows.find((r) => r.step_id === stepId);
    if (row?.photo_url) {
      return Response.json({ url: row.photo_url, fromCache: true });
    }
  }

  // refresh : prendre une autre page (2 à 5) pour varier
  const unsplashPage = refresh && page === 1
    ? Math.floor(Math.random() * 4) + 2
    : page;

  const result = await fetchPhotoForCity(ville, { stepId, page: unsplashPage });
  if (!result) {
    return Response.json({ error: "Aucune photo trouvée" }, { status: 404 });
  }

  await updateItineraryPhotoUrl(stepId, result.url);
  return Response.json({ url: result.url, fromCache: false });
}
