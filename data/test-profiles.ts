import type { EtatVoyage } from "./mock-voyages";

/**
 * Profils de test pour la phase de simulation (hero & démo home).
 * - Julie : nouveau voyageur (aucun voyage)
 * - Thomas : dernier voyage terminé il y a > 20 jours
 * - Marc : un voyage prévu (compte à rebours)
 * - Sophie : voyage en cours
 * - Léa : plusieurs voyages prévus
 */

export interface TestProfile {
  id: string;
  name: string;
  /** État simulé pour les tests (doc / cohérence) */
  etatVoyage?: EtatVoyage;
  /** Libellé explicite sur l’écran de choix de profil (démo). */
  situationLabel: string;
}

/** Profils « voyageurs éditoriaux » (itinéraires Stars, pages publiques partagées). */
export const EDITORIAL_PROFILES: TestProfile[] = [
  {
    id: "eva-viago",
    name: "Eva Viago",
    situationLabel: "Sélection d’itinéraires — littoral & patrimoine",
  },
  {
    id: "matteo-horizons",
    name: "Matteo Horizons",
    situationLabel: "Montagne & villages — lignes éditoriales Viago",
  },
  {
    id: "lina-routes",
    name: "Lina Routes",
    situationLabel: "Vignobles & slow travel — contenus partagés",
  },
];

export const TEST_PROFILES: TestProfile[] = [
  { id: "julie", name: "Julie", etatVoyage: "rien", situationLabel: "Nouveau voyageur" },
  {
    id: "thomas",
    name: "Thomas",
    etatVoyage: "voyage_termine",
    situationLabel: "Dernier voyage il y a plus de 20 jours",
  },
  {
    id: "marc",
    name: "Marc",
    etatVoyage: "voyage_prevu",
    situationLabel: "Prochain voyage dans 3 jours",
  },
  {
    id: "sophie",
    name: "Sophie",
    etatVoyage: "voyage_en_cours",
    situationLabel: "En voyage actuellement",
  },
  {
    id: "lea",
    name: "Léa",
    etatVoyage: "voyage_prevu",
    situationLabel: "Plusieurs voyages prévus",
  },
];

/** Liste des ids valides pour le cookie (middleware). */
export const VALID_PROFILE_IDS = TEST_PROFILES.map((p) => p.id);

export function getProfileById(id: string): TestProfile | undefined {
  return TEST_PROFILES.find((p) => p.id === id) ?? EDITORIAL_PROFILES.find((p) => p.id === id);
}

/** Clé localStorage pour les réponses quiz d'un profil (phase test). */
export function getQuizStorageKey(profileId: string): string {
  return `quiz_${profileId}`;
}
