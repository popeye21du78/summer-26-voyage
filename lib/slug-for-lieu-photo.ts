import { slugFromNom } from "./slug-from-nom";

const LIEU_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;

/** Slug API photo : id d’étape si déjà un slug lieu, sinon dérivé du nom (UUID → bon slug). */
export function slugForLieuPhoto(stepId: string, nom: string): string {
  const s = stepId.trim().toLowerCase();
  if (LIEU_SLUG_RE.test(s)) return s;
  return slugFromNom(nom);
}
