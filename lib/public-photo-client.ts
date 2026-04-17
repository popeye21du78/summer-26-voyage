/**
 * Index embarqué (généré) des URLs « publiques » connues : validations maintenance
 * puis beauty 200 — aligné sur getPublicPhotoPick côté fichiers locaux.
 * + validations utilisateur (localStorage).
 */
import clientIndex from "@/data/maintenance/public-photo-client-index.json";
import {
  matchesUserValidatedPhoto,
  tryUserValidatedPhoto,
} from "@/lib/client-photo-validated";
import { urlsMatchPhoto } from "@/lib/photo-url-compare";

type ClientIndex = {
  validations: Record<string, string[]>;
  beauty: Record<string, string[]>;
  generatedAt?: string;
};

const IDX = clientIndex as ClientIndex;

/** Validations runtime (GET snapshot maintenance) — fusionnées avec l’index build. */
const RUNTIME_VALIDATIONS: Record<string, string[]> = {};

function norm(s: string) {
  return s.trim().toLowerCase();
}

/** Appelé après `/api/photo-validations-snapshot` pour éviter un resolve par lieu. */
export function mergeRuntimeValidationUrls(bySlug: Record<string, string[]>) {
  for (const [k, urls] of Object.entries(bySlug)) {
    const key = norm(k);
    if (!key || !Array.isArray(urls) || urls.length === 0) continue;
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    const prev = RUNTIME_VALIDATIONS[key] ?? [];
    const seen = new Set<string>(prev);
    const merged = [...prev];
    for (const u of clean) {
      if (seen.has(u)) continue;
      seen.add(u);
      merged.push(u);
    }
    RUNTIME_VALIDATIONS[key] = merged;
  }
}

/** Résout la liste d’URLs pour une paire slug / stepId (même ordre que le serveur). */
export function getIndexedPhotoUrlList(slug: string, stepId: string): string[] | null {
  const keys = [norm(slug), norm(stepId)].filter(
    (k, i, arr) => Boolean(k) && arr.indexOf(k) === i
  );
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (arr?: string[]) => {
    if (!Array.isArray(arr)) return;
    for (const raw of arr) {
      const u = raw.trim();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  };
  const v = IDX.validations;
  const u = IDX.beauty;
  for (const key of keys) {
    push(RUNTIME_VALIDATIONS[key]);
  }
  for (const key of keys) {
    push(v[key]);
  }
  for (const key of keys) {
    push(u[key]);
  }
  return out.length ? out : null;
}

/**
 * Liste pour affichage / « Autre » : priorité à la validation utilisateur (une URL figée).
 */
export function getResolvedPhotoUrlList(slug: string, stepId: string): string[] | null {
  const userUrl = tryUserValidatedPhoto(slug, stepId);
  if (userUrl) return [userUrl];
  return getIndexedPhotoUrlList(slug, stepId);
}

export function getClientPublicPhotoPick(
  slug: string,
  stepId: string,
  photoIndex: number
): { url: string; total: number; fromIndexed: true } | null {
  const userFirst = tryUserValidatedPhoto(slug, stepId);
  if (userFirst && photoIndex === 0) {
    return { url: userFirst, total: 1, fromIndexed: true };
  }

  const urls = getIndexedPhotoUrlList(slug, stepId);
  if (!urls?.length) return null;
  const total = urls.length;
  const i = ((photoIndex % total) + total) % total;
  return { url: urls[i], total, fromIndexed: true };
}

/** @deprecated utiliser urlsMatchPhoto */
export const urlsMatchIndexed = urlsMatchPhoto;

/** L’URL affichée est-elle une des URLs indexées pour ce slug / stepId ? */
export function isIndexedPublicPhotoUrl(
  slug: string,
  stepId: string,
  imageUrl: string
): boolean {
  const urls = getIndexedPhotoUrlList(slug, stepId);
  if (!urls?.length) return false;
  return urls.some((u) => urlsMatchPhoto(u, imageUrl));
}

/** Index embarqué OU validation utilisateur (aucune requête API nécessaire). */
export function isOfflineKnownPhoto(slug: string, stepId: string, imageUrl: string): boolean {
  if (matchesUserValidatedPhoto(slug, stepId, imageUrl)) return true;
  return isIndexedPublicPhotoUrl(slug, stepId, imageUrl);
}
