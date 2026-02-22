/**
 * Types pour les lieux issus de lieux-central.xlsx (patrimoine, plages, randos).
 * v4 : fusion patrimoine+pépites, 3 types uniquement.
 */
export type LieuType = "patrimoine" | "plage" | "rando";

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
