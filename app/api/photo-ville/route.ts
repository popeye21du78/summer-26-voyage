import { NextRequest } from "next/server";
import { getItinerary, updateItineraryPhotoUrl } from "../../../lib/itinerary-supabase";
import { getDepartementForVille } from "../../../lib/photo-queries";
import { isPremiumPatrimoineSlug } from "../../../lib/maintenance-photo-queue";
import { getBeautyCuratedPhotosForSlug } from "../../../lib/maintenance-beauty-validations";
import { fetchPhotosForCityFromPexels } from "../../../lib/pexels";
import { fetchPhotoForCity, fetchUnsplashPhotosForCity } from "../../../lib/unsplash";
import { fetchPhotosForCityFromWikipedia } from "../../../lib/wikipedia-photo";
import { slugFromNom } from "../../../lib/slug-from-nom";

const TOTAL_PHOTOS = 10;

type PhotoPick = { url: string; alt: string; credit?: string };

/**
 * GET /api/photo-ville?stepId=X&ville=Y&slug=optional&refresh=1&photoIndex=2
 * - Lieux **premium** (mieux notés / phares) : **Unsplash en premier**, puis Wikipedia + Pexels si besoin.
 * - **Autres** : Wikipedia + Pexels, Unsplash en dernier recours.
 */
export async function GET(req: NextRequest) {
  const stepId = req.nextUrl.searchParams.get("stepId");
  const ville = req.nextUrl.searchParams.get("ville");
  const slugHint = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
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
  const slug = slugHint || slugFromNom(ville.trim());
  const premium = isPremiumPatrimoineSlug(slug);

  const curatedList = getBeautyCuratedPhotosForSlug(slug, TOTAL_PHOTOS) ?? [];
  const curatedPicks: PhotoPick[] = curatedList.map((p) => ({
    url: p.url,
    alt: p.title,
    credit: p.author,
  }));

  /** URLs déjà en JSON : pas d’appel externe pour la première image. */
  if (!refresh && curatedPicks.length > 0) {
    const chosen = curatedPicks[0];
    await updateItineraryPhotoUrl(stepId, chosen.url);
    return Response.json({
      url: chosen.url,
      fromCache: false,
      totalWikipedia: curatedPicks.length,
      premiumPatrimoine: premium,
      source: "beauty_curated",
    });
  }

  const [wikiList, pexelsList] = await Promise.all([
    fetchPhotosForCityFromWikipedia(ville, { departement: departement ?? undefined }),
    fetchPhotosForCityFromPexels(ville, stepId),
  ]);

  const wikiPicks: PhotoPick[] = wikiList.map((w) => ({
    url: w.url,
    alt: w.alt,
    credit: w.credit,
  }));
  const pexelsPicks: PhotoPick[] = pexelsList.map((p) => ({
    url: p.url,
    alt: p.alt,
    credit: p.credit,
  }));

  function mergeUnique(picks: PhotoPick[]): PhotoPick[] {
    const seen = new Set<string>();
    const out: PhotoPick[] = [];
    for (const p of picks) {
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      out.push(p);
    }
    return out;
  }

  let combined: PhotoPick[] = [];

  if (premium) {
    const unsplashList = await fetchUnsplashPhotosForCity(ville, { stepId, max: TOTAL_PHOTOS });
    const unsplashPicks: PhotoPick[] = unsplashList.map((u) => ({
      url: u.url,
      alt: u.alt,
      credit: u.credit ? `${u.credit} / Unsplash` : "Unsplash",
    }));
    combined = mergeUnique([...curatedPicks, ...unsplashPicks, ...wikiPicks, ...pexelsPicks]).slice(
      0,
      TOTAL_PHOTOS
    );
  } else {
    combined = mergeUnique([...curatedPicks, ...wikiPicks, ...pexelsPicks]).slice(0, TOTAL_PHOTOS);
  }

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
      totalWikipedia: combined.length,
      premiumPatrimoine: premium,
    });
  }

  const unsplashPage =
    refresh && page === 1 ? Math.floor(Math.random() * 4) + 2 : page;
  const result = await fetchPhotoForCity(ville, { stepId, page: unsplashPage });
  if (!result) {
    return Response.json({ error: "Aucune photo trouvée" }, { status: 404 });
  }

  await updateItineraryPhotoUrl(stepId, result.url);
  return Response.json({
    url: result.url,
    fromCache: false,
    premiumPatrimoine: premium,
  });
}
