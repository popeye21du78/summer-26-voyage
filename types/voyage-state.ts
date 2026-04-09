import type { EtatVoyage, Voyage } from "../data/mock-voyages";

/** Réponse GET /api/voyage-state — partagé client / serveur (ne pas importer depuis route.ts côté client). */
export interface VoyageStateResponse {
  profileId: string;
  etat: EtatVoyage;
  voyageEnCours?: Voyage;
  voyagePrevu?: Voyage;
  voyagesTermines?: Voyage[];
  jourActuel?: number;
  joursRestants?: number;
  joursDepuisFinDernierVoyage?: number;
  premiereConnexionDuJour?: boolean;
  stepsDuJour?: Array<{
    id: string;
    nom: string;
    lat: number;
    lng: number;
    description: string;
    dureeConseillee?: string;
  }>;
}
