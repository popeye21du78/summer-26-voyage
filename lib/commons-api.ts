/**
 * API Wikimedia Commons — recherche d'images et métadonnées légales.
 * Usage : test à la demande sur les pages ville, puis batch si satisfaisant.
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "VoyageVoyage/1.0 (https://github.com/voyage-voyage; contact@example.com)";

export interface CommonsPhoto {
  /** URL de l'image (largeur 1200px pour affichage) */
  url: string;
  /** URL de la page Commons du fichier (source pour attribution) */
  sourceUrl: string;
  /** Titre du fichier (ex. File:Domme_vue.jpg) */
  title: string;
  /** Description Commons (pour scoring vue/détail) */
  description?: string;
  /** Dimensions en pixels */
  width: number;
  height: number;
  /** Taille fichier en octets */
  size: number;
  /** Date d'upload (ISO) */
  timestamp: string;
  /** Auteur (nom ou pseudo) */
  author: string;
  /** Licence courte (ex. CC BY-SA 4.0) */
  license: string;
  /** URL de la licence (pour lien dans attribution) */
  licenseUrl: string;
  /** Score de qualité (pour tri) */
  score: number;
}

interface SearchResult {
  title: string;
  pageid: number;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    size?: number;
    timestamp?: string;
    extmetadata?: Record<
      string,
      { value?: string }
    >;
  }>;
}

function scoreCandidate(
  width: number,
  height: number,
  size: number,
  timestamp: string,
  description = ""
): number {
  let score = 0;
  const year = new Date(timestamp).getFullYear();

  if (width >= 1200) score += 2;
  else if (width >= 800) score += 1;

  if (size >= 200_000) score += 1;

  if (year >= 2020) score += 3;
  else if (year >= 2015) score += 2;
  else if (year >= 2010) score += 1;
  else if (year < 2000) score -= 2;

  const ratio = width / (height || 1);
  if (ratio >= 1.2 && ratio <= 2.2) score += 1;

  const desc = description.toLowerCase();
  if (/window|fenêtre|interior|intérieur|detail|détail|close-?up|gros plan/i.test(desc)) score -= 3;
  else if (/mauersegler|apus apus|oiseau|bird|animal|insecte|spider|araignée/i.test(desc)) score -= 4;
  else if (/view of|view from|vue de|vue du|vue depuis|panorama|from the (castle|east|south)|château/i.test(desc)) score += 2;

  return score;
}

function extractDescription(extmetadata: Record<string, { value?: string }> | undefined): string {
  const raw = extmetadata?.ImageDescription?.value ?? "";
  if (!raw) return "";
  try {
    return raw.replace(/<[^>]+>/g, "").trim().slice(0, 500);
  } catch {
    return "";
  }
}

function extractLegalInfo(extmetadata: Record<string, { value?: string }> | undefined): {
  author: string;
  license: string;
  licenseUrl: string;
} {
  const artist = extmetadata?.Artist?.value ?? "";
  const licenseShort = extmetadata?.LicenseShortName?.value ?? "";
  const licenseRaw = extmetadata?.License?.value ?? "";

  let author = artist;
  try {
    const parsed = /^<a[^>]*>([^<]+)<\/a>/.exec(artist);
    if (parsed) author = parsed[1].trim();
  } catch {
    author = artist.replace(/<[^>]+>/g, "").trim();
  }

  const licenseUrlMatch = licenseRaw.match(/href="([^"]+)"/);
  const licenseUrl = licenseUrlMatch?.[1] ?? "https://creativecommons.org/licenses/";

  return {
    author: author || "Inconnu",
    license: licenseShort || "Licence libre",
    licenseUrl,
  };
}

async function searchCommons(query: string, limit = 15): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    gsrqiprofile: "popular_inclinks_pv",
    prop: "imageinfo",
    iiprop: "url|size|timestamp|extmetadata",
    iiurlwidth: "1200",
    iiextmetadatafilter: "Artist|LicenseShortName|License|ImageDescription",
  });

  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip" },
  });

  if (!res.ok) throw new Error(`Commons API error: ${res.status}`);

  const data = (await res.json()) as { query?: { pages?: Record<string, SearchResult> } };
  const pages = data?.query?.pages ?? {};

  const REJECT_TITLE =
    /gravure|engraving|etching|lithograph|peinture|painting|satellite|NASA|ISS|Landsat|Sentinel|Copernicus|orbital|vue aérienne satellite|fra le belve|Due cuori|Totò|Vera Carmi|interior|intérieur|\bmap\b|plan de|ground.?plan|blason|coat of arms|écusson|panneau|diagram|schema|schéma|logo\.svg/i;
  const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

  const candidates: CommonsPhoto[] = [];

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url && !info?.thumburl) continue;

    const fileTitle = page.title.replace(/^File:/, "");
    if (REJECT_TITLE.test(fileTitle)) continue;
    if (!IMAGE_EXT.test(fileTitle)) continue;

    const width = info.width ?? 0;
    const height = info.height ?? 0;
    const size = info.size ?? 0;
    const timestamp = info.timestamp ?? "";

    if (width < 400 || height < 300) continue;
    if (size < 20_000) continue;

    const { author, license, licenseUrl } = extractLegalInfo(info.extmetadata);
    const description = extractDescription(info.extmetadata);
    const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;

    candidates.push({
      url: info.url ?? info.thumburl ?? "",
      sourceUrl,
      title: fileTitle,
      description,
      width,
      height,
      size,
      timestamp,
      author,
      license,
      licenseUrl,
      score: scoreCandidate(width, height, size, timestamp, description),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/** Recherche par géolocalisation (centre-ville, exclut monuments éloignés type Pont du Gard). */
async function searchCommonsByGeo(
  lat: number,
  lng: number,
  radiusMeters: number,
  limit = 30
): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(radiusMeters),
    ggsnamespace: "6",
    ggslimit: String(limit),
    ggsprimary: "all",
    prop: "imageinfo",
    iiprop: "url|size|timestamp|extmetadata",
    iiurlwidth: "1200",
    iiextmetadatafilter: "Artist|LicenseShortName|License|ImageDescription",
  });

  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip" },
  });

  if (!res.ok) throw new Error(`Commons API error: ${res.status}`);

  const data = (await res.json()) as { query?: { pages?: Record<string, SearchResult> } };
  const pages = data?.query?.pages ?? {};

  const REJECT_TITLE =
    /gravure|engraving|etching|lithograph|peinture|painting|satellite|NASA|ISS|Landsat|Sentinel|Copernicus|orbital|vue aérienne satellite|fra le belve|Due cuori|Totò|Vera Carmi|interior|intérieur|\bmap\b|plan de|ground.?plan|blason|coat of arms|écusson|panneau|diagram|schema|schéma|logo\.svg/i;
  const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

  const candidates: CommonsPhoto[] = [];

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url && !info?.thumburl) continue;

    const fileTitle = page.title.replace(/^File:/, "");
    if (REJECT_TITLE.test(fileTitle)) continue;
    if (!IMAGE_EXT.test(fileTitle)) continue;

    const width = info.width ?? 0;
    const height = info.height ?? 0;
    const size = info.size ?? 0;
    const timestamp = info.timestamp ?? "";

    if (width < 400 || height < 300) continue;
    if (size < 20_000) continue;

    const { author, license, licenseUrl } = extractLegalInfo(info.extmetadata);
    const description = extractDescription(info.extmetadata);
    const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;

    candidates.push({
      url: info.url ?? info.thumburl ?? "",
      sourceUrl,
      title: fileTitle,
      description,
      width,
      height,
      size,
      timestamp,
      author,
      license,
      licenseUrl,
      score: scoreCandidate(width, height, size, timestamp, description),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/** Recherche les N meilleures photos par géolocalisation (header). */
export async function fetchTopCommonsPhotosByGeo(
  lat: number,
  lng: number,
  radiusMeters: number,
  topN = 3
): Promise<CommonsPhoto[]> {
  const candidates = await searchCommonsByGeo(lat, lng, radiusMeters, 50);
  return candidates.slice(0, topN);
}

/** Recherche les N meilleures photos. Requête brute (pas de -zone -plan etc. qui casse la recherche). */
export async function fetchTopCommonsPhotos(
  searchQuery: string,
  topN = 3
): Promise<CommonsPhoto[]> {
  const candidates = await searchCommons(searchQuery.trim(), 50);
  return candidates.slice(0, topN);
}

/**
 * Fenêtre paginée sur les candidats déjà triés (outil maintenance : « afficher autres »).
 */
export async function fetchCommonsPhotosWindow(
  searchQuery: string,
  offset: number,
  windowSize: number,
  opts?: { minWidth?: number }
): Promise<{ photos: CommonsPhoto[]; totalCandidates: number; query: string }> {
  let candidates = await searchCommons(searchQuery.trim(), 50);
  const minW = opts?.minWidth;
  if (minW != null) {
    candidates = candidates.filter((c) => c.width >= minW);
  }
  return {
    photos: candidates.slice(offset, Math.max(0, offset) + windowSize),
    totalCandidates: candidates.length,
    query: searchQuery.trim(),
  };
}

/** Plusieurs requêtes FR+EN en parallèle, fusion, déduplication, top N par concept. */
export async function fetchPhotosByConcepts(
  concepts: { label: string; queries: string[] }[],
  perConcept: number
): Promise<{ label: string; photos: CommonsPhoto[] }[]> {
  const results = await Promise.all(
    concepts.map(async ({ label, queries }) => {
      const all = await Promise.all(
        queries.map((q) => searchCommons(q.trim(), 30))
      );
      const seen = new Set<string>();
      const merged: CommonsPhoto[] = [];
      for (const list of all) {
        for (const p of list) {
          if (!seen.has(p.url)) {
            seen.add(p.url);
            merged.push(p);
          }
        }
      }
      merged.sort((a, b) => b.score - a.score);
      return { label, photos: merged.slice(0, perConcept) };
    })
  );
  return results;
}

/** Délai entre requêtes (étiquette API). */
export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
