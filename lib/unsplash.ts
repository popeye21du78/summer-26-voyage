/**
 * Récupère une photo Unsplash pour une ville.
 * Requêtes en cascade ; une image est gardée si les métadonnées citent le lieu **ou**
 * si la requête de recherche contient déjà le nom du lieu (classement Unsplash).
 */

import { getPhotoQueries } from "./photo-queries";
import { buildPlaceAnchors, unsplashPhotoRelevantToPlace } from "./unsplash-place-match";

const UNSPLASH_ACCESS_KEY =
  process.env.UNSPLASH_ACCESS_KEY ?? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export interface UnsplashResult {
  url: string;
  alt: string;
  credit?: string;
  /** Page photo sur Unsplash (attribution). */
  sourceUrl?: string;
}

type UnsplashPhoto = {
  urls?: { full?: string; regular?: string };
  alt_description?: string | null;
  description?: string | null;
  tags?: { title?: string }[];
  tags_preview?: { title?: string }[];
  user?: { name?: string };
  links?: { html?: string };
  width?: number;
  height?: number;
};

const MAX_API_PAGES_PER_QUERY = 10;

/** Réponse recherche Unsplash (total = nombre de résultats annoncés). */
async function searchUnsplashRaw(
  query: string,
  perPage: number,
  page: number = 1
): Promise<{ results: UnsplashPhoto[]; total: number }> {
  if (!UNSPLASH_ACCESS_KEY) return { results: [], total: 0 };
  const n = Math.min(30, Math.max(1, perPage));
  try {
    const encoded = encodeURIComponent(query);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);
    /** order_by=relevant = défaut recherche site ; pas d’orientation = même périmètre que la barre de recherche. */
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encoded}&per_page=${n}&page=${page}&order_by=relevant`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        next: { revalidate: 0 },
        signal: ctrl.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("Unsplash API:", res.status, errBody.slice(0, 300));
      return { results: [], total: 0 };
    }
    const data = (await res.json()) as { results?: UnsplashPhoto[]; total?: number };
    return { results: data.results ?? [], total: typeof data.total === "number" ? data.total : 0 };
  } catch (e) {
    const err = e as Error;
    if (err.name !== "AbortError") console.warn("Unsplash search raw:", err.message);
    return { results: [], total: 0 };
  }
}

/** Photo format maintenance (aligné sur le tri Commons). */
export type UnsplashMaintenancePhoto = {
  url: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
};

function unsplashPhotoToMaintenance(photo: UnsplashPhoto, fallbackTitle: string): UnsplashMaintenancePhoto | null {
  const url = buildUrl(photo);
  if (!url) return null;
  const author = photo.user?.name ?? "Unsplash";
  return {
    url,
    title: (photo.alt_description ?? fallbackTitle).slice(0, 200),
    author,
    sourceUrl: photo.links?.html ?? "https://unsplash.com",
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    width: typeof photo.width === "number" ? photo.width : 1200,
    height: typeof photo.height === "number" ? photo.height : 800,
  };
}

/**
 * Fenêtre paginée (maintenance top 200). Filtre métadonnées **ou** requête contenant le lieu.
 */
export async function fetchUnsplashPhotosWindow(args: {
  queries: string[];
  offset: number;
  windowSize: number;
  cityName: string;
  stepId?: string;
}): Promise<{
  photos: UnsplashMaintenancePhoto[];
  totalCandidates: number;
  query: string;
  hasMore: boolean;
}> {
  const { queries, offset, windowSize, cityName, stepId } = args;
  const ws = Math.min(10, Math.max(1, windowSize));
  const off = Math.max(0, offset);
  const list = queries.map((q) => q.trim()).filter(Boolean);
  if (!UNSPLASH_ACCESS_KEY || !list.length) {
    return { photos: [], totalCandidates: 0, query: "", hasMore: false };
  }

  const anchors = buildPlaceAnchors(cityName, stepId);
  const need = off + ws + 1;
  const seen = new Set<string>();
  const filtered: UnsplashMaintenancePhoto[] = [];
  let qUsed = list[0] ?? "";

  outer: for (const q of list) {
    qUsed = q;
    for (let apiPage = 1; apiPage <= MAX_API_PAGES_PER_QUERY; apiPage++) {
      const { results } = await searchUnsplashRaw(q, 30, apiPage);
      if (results.length === 0) break;

      for (const ph of results) {
        if (!unsplashPhotoRelevantToPlace(ph, anchors, q)) continue;
        const m = unsplashPhotoToMaintenance(ph, q);
        if (m && !seen.has(m.url)) {
          seen.add(m.url);
          filtered.push(m);
          if (filtered.length >= need) break outer;
        }
      }
      if (results.length < 30) break;
    }
  }

  const photos = filtered.slice(off, off + ws);
  const hasMore = filtered.length > off + ws;
  /** Toujours afficher la 1re requête prévue (comme sur le site), pas la dernière fallback essayée. */
  const queryLabel = list[0] ?? qUsed;
  return {
    photos,
    totalCandidates: filtered.length,
    query: queryLabel,
    hasMore,
  };
}

function photoToResult(photo: UnsplashPhoto, cityName: string): UnsplashResult | null {
  const url = buildUrl(photo);
  if (!url) return null;
  return {
    url,
    alt: photo.alt_description ?? cityName,
    credit: photo.user?.name,
    sourceUrl: photo.links?.html,
  };
}

/**
 * Jusqu’à `max` photos Unsplash pour une ville (requêtes en cascade comme une seule photo).
 */
export async function fetchUnsplashPhotosForCity(
  cityName: string,
  options?: { stepId?: string; max?: number }
): Promise<UnsplashResult[]> {
  const max = Math.min(30, Math.max(1, options?.max ?? 10));
  if (!UNSPLASH_ACCESS_KEY) return [];

  const queries = getPhotoQueries(cityName, options?.stepId);
  const anchors = buildPlaceAnchors(cityName, options?.stepId);
  const out: UnsplashResult[] = [];
  const seen = new Set<string>();

  outer: for (const query of queries) {
    for (let apiPage = 1; apiPage <= MAX_API_PAGES_PER_QUERY; apiPage++) {
      const { results } = await searchUnsplashRaw(query, 30, apiPage);
      if (results.length === 0) break;
      for (const photo of results) {
        if (!unsplashPhotoRelevantToPlace(photo, anchors, query)) continue;
        const r = photoToResult(photo, cityName);
        if (r && !seen.has(r.url)) {
          seen.add(r.url);
          out.push(r);
          if (out.length >= max) break outer;
        }
      }
      if (results.length < 30) break;
    }
  }

  return out;
}

/**
 * Recherche libre (ex. « église X France ») — filtre lieu via métadonnées ou présence du lieu dans `query`.
 */
export async function fetchUnsplashPhotosForQuery(
  query: string,
  max: number = 3,
  place: { cityName: string; stepId?: string }
): Promise<UnsplashResult[]> {
  const m = Math.min(30, Math.max(1, max));
  if (!UNSPLASH_ACCESS_KEY) return [];
  const anchors = buildPlaceAnchors(place.cityName, place.stepId);
  const out: UnsplashResult[] = [];
  const seen = new Set<string>();

  const qTrim = query.trim();
  for (let apiPage = 1; apiPage <= MAX_API_PAGES_PER_QUERY && out.length < m; apiPage++) {
    const { results } = await searchUnsplashRaw(qTrim, 30, apiPage);
    if (results.length === 0) break;
    for (const photo of results) {
      if (!unsplashPhotoRelevantToPlace(photo, anchors, qTrim)) continue;
      const r = photoToResult(photo, place.cityName);
      if (r && !seen.has(r.url)) {
        seen.add(r.url);
        out.push(r);
        if (out.length >= m) break;
      }
    }
    if (results.length < 30) break;
  }
  return out;
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

  const wantPage = Math.max(1, options?.page ?? 1);
  const queries = getPhotoQueries(cityName, options?.stepId);
  const anchors = buildPlaceAnchors(cityName, options?.stepId);
  const pool: UnsplashResult[] = [];
  const seen = new Set<string>();

  outer: for (const query of queries) {
    for (let apiPage = 1; apiPage <= MAX_API_PAGES_PER_QUERY; apiPage++) {
      try {
        const { results } = await searchUnsplashRaw(query, 30, apiPage);
        if (results.length === 0) break;
        for (const photo of results) {
          if (!unsplashPhotoRelevantToPlace(photo, anchors, query)) continue;
          const r = photoToResult(photo, cityName);
          if (r && !seen.has(r.url)) {
            seen.add(r.url);
            pool.push(r);
            if (pool.length >= wantPage) break outer;
          }
        }
        if (results.length < 30) break;
      } catch (e) {
        const err = e as Error;
        console.warn("Unsplash fetch error:", err.message);
      }
    }
  }

  return pool[wantPage - 1] ?? null;
}
