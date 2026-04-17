/**
 * Photos validées une fois depuis l’app (mobile) — persistance localStorage.
 * Aucun appel API photo-curation / resolve nécessaire pour ces couples slug+URL.
 */
import { urlsMatchPhoto } from "@/lib/photo-url-compare";

const LS_KEY = "vv:user-validated-photos:v1";

type Store = Record<string, string>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Store;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function normKey(s: string) {
  return s.trim().toLowerCase();
}

export function persistUserValidatedPhoto(slug: string, url: string) {
  const k = normKey(slug);
  const u = url.trim();
  if (!k || !u) return;
  try {
    const data = readStore();
    data[k] = u;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function getUserValidatedPhotoUrl(slug: string): string | null {
  const k = normKey(slug);
  if (!k) return null;
  const data = readStore();
  const u = data[k]?.trim();
  return u || null;
}

/** Première URL trouvée pour slug ou stepId. */
export function tryUserValidatedPhoto(slug: string, stepId: string): string | null {
  return getUserValidatedPhotoUrl(slug) || getUserValidatedPhotoUrl(stepId);
}

export function matchesUserValidatedPhoto(
  slug: string,
  stepId: string,
  imageUrl: string
): boolean {
  const a = tryUserValidatedPhoto(slug, stepId);
  if (!a) return false;
  return urlsMatchPhoto(a, imageUrl);
}
