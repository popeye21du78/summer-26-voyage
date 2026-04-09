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
 * Fichiers souvent hors-sujet pour une photo de ville (article Wikipédia = mélange muséum, schémas, etc.).
 */
const REJECT_WIKI_IMAGE_TITLE_OR_URL =
  /papillon|butterfly|lepidopter|chenille|moth|insecte|scarab|coléoptère|oiseau|bird|araignée|spider|poisson|fish|crustacé|reptile|amphibien|microscope|cellule|dna|arn\b|molécule|histolog|tissu biologique|diagram|schéma|schema|coupe géologique|section géologique|logo|icon-?|favicon|\.svg|blason|coat.?of.?arms|écusson|armoiries|gravure|lithograph|carte[_ -]?(politique|géographique|administrative)|physical map|relief map|plan de ville|ground.?plan|portrait[_ -]de|photo[_ -]de[_ -]groupe|signature\.|sceau\.|tampon/i;

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

function isRejectedWikiImage(fileTitle: string | undefined, url: string | undefined): boolean {
  const t = `${fileTitle ?? ""} ${url ?? ""}`;
  return REJECT_WIKI_IMAGE_TITLE_OR_URL.test(t);
}

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

  const pageImageLabel = mainPage?.pageimage ?? mainPage?.title ?? "";

  const results: WikipediaPhotoResult[] = [];
  if (mainUrl && !isRejectedWikiImage(pageImageLabel, mainUrl)) {
    results.push({ url: mainUrl, alt: title, credit: "Wikipedia" });
  }

  // 2) Autres images de la page (generator=images) — filtrer muséum / schémas / cartes
  const genParams = new URLSearchParams({
    action: "query",
    generator: "images",
    format: "json",
    origin: "*",
    gimlimit: "40",
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

  const seen = new Set<string>(results.map((r) => r.url));
  if (mainUrl) seen.add(mainUrl);

  for (const p of Object.values(genPages)) {
    if (results.length >= WIKI_MAX_PHOTOS) break;
    const fileTitle = p.title ?? "";
    const url = p.imageinfo?.[0]?.url ?? p.imageinfo?.[0]?.thumburl;
    if (!url || seen.has(url)) continue;
    if (isRejectedWikiImage(fileTitle, url)) continue;
    seen.add(url);
    results.push({
      url,
      alt: fileTitle.replace(/^File:/i, "").replace(/_/g, " ") || title,
      credit: "Wikipedia",
    });
  }

  return results;
}
