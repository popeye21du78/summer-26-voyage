import type { MaintenanceLieuRow } from "./maintenance-photo-queue";

/** Requête texte Commons pour un lieu (évite homonymes hors France). */
export function buildCommonsSearchQuery(lieu: MaintenanceLieuRow): string {
  const nom = lieu.nom.trim();
  if (!nom) return "";
  return `${nom} France`;
}

export function buildCommonsSearchQueryFromNom(nom: string): string {
  const n = nom.trim();
  if (!n) return "";
  return `${n} France`;
}
