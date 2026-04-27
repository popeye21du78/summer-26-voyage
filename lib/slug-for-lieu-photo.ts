import { slugFromNom } from "./slug-from-nom";

const LIEU_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;

/** Slug API photo : id d’étape si déjà un slug lieu, sinon dérivé du nom (UUID → bon slug). */
export function slugForLieuPhoto(stepId: string, nom: string): string {
  const s = stepId.trim().toLowerCase();
  /** Les ids générés (`custom-…`) matchent le regex mais ne sont pas des slugs lieu. */
  if (/^custom-\d+$/.test(s)) return slugFromNom(nom);
  if (LIEU_SLUG_RE.test(s)) {
    /**
     * Préparer « Tes propres villes » : `slugifyCityId` donne `lyon-0`, `lille-1`…
     * L’index beauty / validations est indexé sur `lyon`, `lille` — on dérive le slug lieu.
     */
    if (/-\d+$/.test(s)) return slugFromNom(nom);
    return s;
  }
  return slugFromNom(nom);
}
