/**
 * Photo de ville via Wikipedia (FR).
 * L’image principale de l’article correspond en général au vrai lieu (bien plus fiable qu’Unsplash).
 * On peut récupérer plusieurs images par page (limite WIKI_MAX_PHOTOS) pour « Changer de photo ».
 */

export interface WikipediaPhotoResult {
  url: string;
  alt: string;
  credit: string;
}

const WIKI_API = "https://fr.wikipedia.org/w/api.php";

/** Nombre max d’images récupérées par page (pour « Changer de photo »). */
export const WIKI_MAX_PHOTOS = 10;

/**
 * Récupère jusqu’à WIKI_MAX_PHOTOS images de la page Wikipedia de la ville.
 * Ordre : image principale en premier, puis les autres. index permet de choisir une autre (0 = première).
 */
export async function fetchPhotosForCityFromWikipedia(
  ville: string,
  options?: { departement?: string; index?: number }
): Promise<WikipediaPhotoResult[]> {
  const titles = [ville.trim()];
  if (options?.departement?.trim()) {
    titles.push(`${ville.trim()} (${options.departement.trim()})`);
  }

  for (const title of titles) {
    const list = await fetchPageImages(title);
    if (list.length > 0) return list;
  }

  return [];
}

/**
 * Une seule photo : la première ou celle à l’index (pour compat ancienne API).
 */
export async function fetchPhotoForCityFromWikipedia(
  ville: string,
  options?: { departement?: string }
): Promise<WikipediaPhotoResult | null> {
  const list = await fetchPhotosForCityFromWikipedia(ville, options);
  return list[0] ?? null;
}

type WikiPage = {
  pageimage?: string;
  thumbnail?: { source?: string };
  original?: { source?: string };
  title?: string;
  imageinfo?: Array<{ url?: string; thumburl?: string }>;
};

/**
 * Récupère la liste d’images d’une page : d’abord l’image principale (pageimages), puis les autres (generator=images).
 */
async function fetchPageImages(title: string): Promise<WikipediaPhotoResult[]> {
  const headers = {
    "User-Agent": "VanLifeJournal/1.0 (https://github.com/vanlife-journal)",
  };
  const opts = { headers, next: { revalidate: 86400 } as const };

  // 1) Image principale (pageimages)
  const mainParams = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    format: "json",
    origin: "*",
    piprop: "original|thumbnail",
    pithumbsize: "1200",
    titles: title,
  });
  const mainRes = await fetch(`${WIKI_API}?${mainParams.toString()}`, opts);
  if (!mainRes.ok) return [];

  const mainData = (await mainRes.json()) as {
    query?: { pages?: Record<string, WikiPage> };
  };
  const mainPages = mainData.query?.pages;
  const mainPage = mainPages ? Object.values(mainPages)[0] : null;
  const mainUrl =
    mainPage && !("missing" in mainPage)
      ? mainPage.original?.source ?? mainPage.thumbnail?.source
      : null;

  const results: WikipediaPhotoResult[] = [];
  if (mainUrl) results.push({ url: mainUrl, alt: title, credit: "Wikipedia" });

  // 2) Autres images de la page (generator=images, max WIKI_MAX_PHOTOS - 1)
  const genParams = new URLSearchParams({
    action: "query",
    generator: "images",
    format: "json",
    origin: "*",
    gimlimit: String(Math.max(1, WIKI_MAX_PHOTOS - 1)),
    titles: title,
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1200",
  });
  const genRes = await fetch(`${WIKI_API}?${genParams.toString()}`, opts);
  if (!genRes.ok) return results;

  const genData = (await genRes.json()) as {
    query?: { pages?: Record<string, WikiPage> };
  };
  const genPages = genData.query?.pages;
  if (!genPages) return results;

  const seen = new Set<string>(mainUrl ? [mainUrl] : []);
  for (const p of Object.values(genPages)) {
    const url = p.imageinfo?.[0]?.url ?? p.imageinfo?.[0]?.thumburl;
    if (url && !seen.has(url) && results.length < WIKI_MAX_PHOTOS) {
      seen.add(url);
      results.push({
        url,
        alt: p.title ?? title,
        credit: "Wikipedia",
      });
    }
  }

  return results;
}
