/**
 * Récupère une photo Unsplash pour une ville.
 * Requêtes affinées + cascade fallback (ville → département → région).
 */

import { getPhotoQueries } from "./photo-queries";

const UNSPLASH_ACCESS_KEY =
  process.env.UNSPLASH_ACCESS_KEY ?? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export interface UnsplashResult {
  url: string;
  alt: string;
  credit?: string;
}

type UnsplashPhoto = {
  urls?: { full?: string; regular?: string };
  alt_description?: string;
  user?: { name?: string };
};

async function searchUnsplash(
  query: string,
  page: number = 1
): Promise<UnsplashPhoto | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;

  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encoded}&per_page=1&page=${page}&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.warn("Unsplash API error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { results?: UnsplashPhoto[] };
  return data.results?.[0] ?? null;
}

function buildUrl(photo: UnsplashPhoto): string | null {
  const rawUrl = photo?.urls?.full ?? photo?.urls?.regular;
  if (!rawUrl) return null;
  const sep = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${sep}w=1200&q=85`;
}

/**
 * Cherche une photo par ville. Cascade de requêtes + page optionnelle (pour "changer de photo").
 */
export async function fetchPhotoForCity(
  cityName: string,
  options?: { stepId?: string; page?: number }
): Promise<UnsplashResult | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("Unsplash: clé API non configurée");
    return null;
  }

  const page = options?.page ?? 1;
  const queries = getPhotoQueries(cityName, options?.stepId);

  for (const query of queries) {
    try {
      const photo = await searchUnsplash(query, page);
      if (!photo) continue;

      const url = buildUrl(photo);
      if (!url) continue;

      return {
        url,
        alt: photo.alt_description ?? cityName,
        credit: photo.user?.name,
      };
    } catch (e) {
      const err = e as Error;
      console.warn("Unsplash fetch error:", err.message);
    }
  }

  return null;
}
