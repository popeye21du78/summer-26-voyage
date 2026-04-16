import { getBeautyCuratedPhotosForSlug } from "@/lib/maintenance-beauty-validations";
import {
  getValidationForSlug,
  listValidatedPhotos,
} from "@/lib/maintenance-photo-validations";

const MAX = 24;

export type PublicPhotoPick = {
  url: string;
  total: number;
  source: "beauty_curated" | "maintenance_validated";
};

/**
 * Photos déjà « sur le site » : beauty-200 puis validations (fichier + Supabase).
 */
export async function getPublicPhotoPick(
  slug: string,
  stepId: string | undefined,
  photoIndex: number
): Promise<PublicPhotoPick | null> {
  const norm = (s: string) => s.trim().toLowerCase();

  function beautyFor(key: string) {
    return getBeautyCuratedPhotosForSlug(norm(key), MAX) ?? [];
  }

  const slugKey = norm(slug);
  let b = beautyFor(slugKey);
  if (b.length === 0 && stepId) {
    b = beautyFor(stepId);
  }
  if (b.length > 0) {
    const i = ((photoIndex % b.length) + b.length) % b.length;
    return {
      url: b[i].url,
      total: b.length,
      source: "beauty_curated",
    };
  }

  const entry =
    (await getValidationForSlug(slugKey)) ??
    (stepId ? await getValidationForSlug(norm(stepId)) : undefined);
  const m = listValidatedPhotos(entry);
  if (m.length > 0) {
    const i = ((photoIndex % m.length) + m.length) % m.length;
    return {
      url: m[i].url,
      total: m.length,
      source: "maintenance_validated",
    };
  }

  return null;
}
