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
 * Photos déjà « sur le site » :
 * 1) Validations (fichier + Supabase) — priorité : URL déjà choisie, affichage prévisible.
 * 2) Beauty 200 (JSON embarqué dans le déploiement).
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
  const stepKey = stepId ? norm(stepId) : undefined;

  const entry =
    (await getValidationForSlug(slugKey)) ??
    (stepKey ? await getValidationForSlug(stepKey) : undefined);
  const validated = listValidatedPhotos(entry);
  if (validated.length > 0) {
    const i = ((photoIndex % validated.length) + validated.length) % validated.length;
    return {
      url: validated[i].url,
      total: validated.length,
      source: "maintenance_validated",
    };
  }

  let b = beautyFor(slugKey);
  if (b.length === 0 && stepKey) {
    b = beautyFor(stepKey);
  }
  if (b.length > 0) {
    const i = ((photoIndex % b.length) + b.length) % b.length;
    return {
      url: b[i].url,
      total: b.length,
      source: "beauty_curated",
    };
  }

  return null;
}
