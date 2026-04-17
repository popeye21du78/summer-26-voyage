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

function norm(s: string) {
  return s.trim().toLowerCase();
}

/** Résout la liste d’URLs pour une paire slug / stepId (même ordre que le serveur). */
export function getIndexedPhotoUrlList(slug: string, stepId: string): string[] | null {
  const a = norm(slug);
  const b = norm(stepId);
  const v = IDX.validations;
  const u = IDX.beauty;
  const tryLists = [v[a], v[b], u[a], u[b]].filter(
    (x): x is string[] => Array.isArray(x) && x.length > 0
  );
  if (tryLists.length === 0) return null;
  return tryLists[0];
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
