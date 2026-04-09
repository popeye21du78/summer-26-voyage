/**
 * Photos fiche lieu (hors validations manuelles) : Wikipédia FR en tête
 * (images de page, filtrées), puis Commons géo / recherche nom.
 */

import type { LieuPoint } from "./lieux-types";
import type { CommonsPhoto } from "./commons-api";
import { fetchTopCommonsPhotos, fetchTopCommonsPhotosByGeo } from "./commons-api";
import { fetchPhotosForCityFromWikipedia, type WikipediaPhotoResult } from "./wikipedia-photo";

const GEO_RADIUS_M = 4000;

function wikiResultToCommons(w: WikipediaPhotoResult, score: number): CommonsPhoto {
  return {
    url: w.url,
    sourceUrl: w.url,
    title: (w.alt || "Wikipédia").slice(0, 200),
    width: 1200,
    height: 800,
    size: 0,
    timestamp: new Date().toISOString(),
    author: w.credit,
    license: "Wikipedia / Wikimedia",
    licenseUrl: "https://fr.wikipedia.org",
    score,
  };
}

/** Header : jusqu’à `target` images — d’abord Wikipédia, puis Commons (géo ou nom). */
export async function fetchStrategicHeaderPhotos(
  lieu: LieuPoint | null,
  nom: string,
  departement: string | undefined,
  target: number
): Promise<CommonsPhoto[]> {
  const wikiList = await fetchPhotosForCityFromWikipedia(nom.trim(), {
    departement: departement?.trim() || undefined,
  });
  const out: CommonsPhoto[] = [];
  let s = 100;
  for (const w of wikiList) {
    if (out.length >= target) break;
    out.push(wikiResultToCommons(w, s--));
  }
  if (out.length >= target) return out.slice(0, target);

  let commons: CommonsPhoto[] = [];
  if (lieu?.lat != null && lieu?.lng != null) {
    commons = await fetchTopCommonsPhotosByGeo(lieu.lat, lieu.lng, GEO_RADIUS_M, target - out.length);
  }
  if (commons.length < target - out.length) {
    const need = target - out.length - commons.length;
    const text = await fetchTopCommonsPhotos(nom, Math.max(need, 3));
    const seen = new Set(out.map((p) => p.url));
    for (const p of text) {
      if (commons.length + out.length >= target) break;
      if (!seen.has(p.url)) commons.push(p);
    }
  }
  return [...out, ...commons].slice(0, target);
}
