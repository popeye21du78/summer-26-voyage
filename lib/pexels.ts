/**
 * Photos de ville via Pexels (recherche par requête).
 * Toujours des vraies photos (pas de panneaux / schémas comme sur Wikipedia).
 * Utilisé pour les photos 2, 3, … quand on « Changer de photo ».
 */

import { getPhotoQueries } from "./photo-queries";

const PEXELS_API_KEY =
  process.env.PEXELS_API_KEY ?? process.env.NEXT_PUBLIC_PEXELS_API_KEY;

export interface PexelsPhotoResult {
  url: string;
  alt: string;
  credit: string;
}

/** Max photos Pexels pour le cycle « Changer de photo » (après la 1re = Wikipedia). */
export const PEXELS_MAX_PHOTOS = 9;

type PexelsPhoto = {
  src?: { landscape?: string; large2x?: string; large?: string; original?: string };
  alt?: string;
  photographer?: string;
};

/**
 * Récupère jusqu’à PEXELS_MAX_PHOTOS photos pour une ville (recherche par requête type « Ville France paysage »).
 */
export async function fetchPhotosForCityFromPexels(
  ville: string,
  stepId?: string
): Promise<PexelsPhotoResult[]> {
  if (!PEXELS_API_KEY) return [];

  const queries = getPhotoQueries(ville, stepId);
  const results: PexelsPhotoResult[] = [];

  for (const query of queries) {
    if (results.length >= PEXELS_MAX_PHOTOS) break;
    const list = await searchPexels(query, PEXELS_MAX_PHOTOS - results.length);
    for (const p of list) {
      if (results.length >= PEXELS_MAX_PHOTOS) break;
      const url = p.src?.landscape ?? p.src?.large2x ?? p.src?.large ?? p.src?.original;
      if (url) results.push({
        url,
        alt: p.alt ?? ville,
        credit: p.photographer ? `Photo par ${p.photographer} sur Pexels` : "Pexels",
      });
    }
  }

  return results;
}

async function searchPexels(
  query: string,
  perPage: number = 10
): Promise<PexelsPhoto[]> {
  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    per_page: String(Math.min(80, Math.max(1, perPage))),
    locale: "fr-FR",
  });

  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: PEXELS_API_KEY },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    photos?: Array<{
      src?: { landscape?: string; large2x?: string; large?: string; original?: string };
      alt?: string;
      photographer?: string;
    }>;
  };

  return data.photos ?? [];
}
