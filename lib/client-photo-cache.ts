/**
 * Cache session des URLs déjà résolues (photo-resolve / header région / carousel).
 * Réduit les flashs et les attentes au retour sur une même page.
 */
const PREFIX = "vv:photo:";

export function cachePhotoUrl(key: string, url: string) {
  if (typeof window === "undefined" || !url?.trim()) return;
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, url.trim());
  } catch {
    /* quota / private mode */
  }
}

export function getCachedPhotoUrl(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(`${PREFIX}${key}`);
    return v?.trim() ? v : null;
  } catch {
    return null;
  }
}

export function cacheKeysRegionHeader(regionId: string) {
  return `region-header:${regionId.trim().toLowerCase()}`;
}

export function cacheKeysCarouselCard(regionId: string) {
  return `carousel-card:${regionId.trim().toLowerCase()}`;
}

/** Clé stable pour photo-resolve (slug lieu). */
export function cacheKeysLieuResolve(slug: string, stepId: string) {
  return `resolve:${slug.trim().toLowerCase()}|${stepId.trim().toLowerCase()}|0`;
}
