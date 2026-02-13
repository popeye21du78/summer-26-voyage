import { NextRequest } from "next/server";
import { getItinerary, updateItineraryPhotoUrl } from "../../../lib/itinerary-supabase";
import { getDepartementForVille } from "../../../lib/photo-queries";
import { fetchPhotosForCityFromPexels } from "../../../lib/pexels";
import { fetchPhotoForCity } from "../../../lib/unsplash";
import { fetchPhotoForCityFromWikipedia } from "../../../lib/wikipedia-photo";

/** Photo 0 = Wikipedia (lead). Photos 1+ = Pexels (vraies photos, pas de panneaux). */
const TOTAL_PHOTOS = 10;

/**
 * GET /api/photo-ville?stepId=X&ville=Y&refresh=1&photoIndex=2
 * - Photo 0 : Wikipedia (FR) image principale → la bonne ville.
 * - Photos 1 à 9 : Pexels (recherche par requête) → vraies photos, pas de panneaux.
 * - refresh=1 : ignore le cache, photoIndex pour cycle.
 * - Fallback si pas Pexels : Unsplash.
 */
export async function GET(req: NextRequest) {
  const stepId = req.nextUrl.searchParams.get("stepId");
  const ville = req.nextUrl.searchParams.get("ville");
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const pageParam = req.nextUrl.searchParams.get("page");
  const page = pageParam ? Math.min(10, Math.max(1, parseInt(pageParam, 10) || 2)) : 1;
  const photoIndexParam = req.nextUrl.searchParams.get("photoIndex");
  const photoIndex = photoIndexParam
    ? Math.min(TOTAL_PHOTOS - 1, Math.max(0, parseInt(photoIndexParam, 10) || 0))
    : undefined;

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

  const departement = getDepartementForVille(ville, stepId);

  // 1) Photo 0 = Wikipedia (lead uniquement). Photos 1+ = Pexels.
  const [wikiLead, pexelsList] = await Promise.all([
    fetchPhotoForCityFromWikipedia(ville, { departement: departement ?? undefined }),
    fetchPhotosForCityFromPexels(ville, stepId),
  ]);

  const combined = [
    ...(wikiLead ? [wikiLead] : []),
    ...pexelsList,
  ].slice(0, TOTAL_PHOTOS);

  if (combined.length > 0) {
    const idx =
      refresh && photoIndex !== undefined
        ? photoIndex % combined.length
        : refresh
          ? Math.floor(Math.random() * combined.length)
          : 0;
    const chosen = combined[idx];
    await updateItineraryPhotoUrl(stepId, chosen.url);
    return Response.json({
      url: chosen.url,
      fromCache: false,
      totalWikipedia: combined.length, // total du cycle (Wikipedia + Pexels)
    });
  }

  // 2) Fallback Unsplash
  const unsplashPage =
    refresh && page === 1 ? Math.floor(Math.random() * 4) + 2 : page;
  const result = await fetchPhotoForCity(ville, { stepId, page: unsplashPage });
  if (!result) {
    return Response.json({ error: "Aucune photo trouvée" }, { status: 404 });
  }

  await updateItineraryPhotoUrl(stepId, result.url);
  return Response.json({ url: result.url, fromCache: false });
}
