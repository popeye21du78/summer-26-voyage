/**
 * Types pour les lieux issus de lieux-central.xlsx (patrimoine, pépites, plages, randos).
 * Compatible avec l’affichage carte (id, nom, slug, lat, lng, departement).
 */
export type LieuType = "patrimoine" | "pepite" | "plage" | "rando";

export interface LieuPoint {
  id: string;
  nom: string;
  slug: string;
  departement: string;
  code_dep: string;
  type: LieuType;
  lat: number;
  lng: number;
  plus_beaux_villages?: "oui" | "non";
}
