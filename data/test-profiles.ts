import type { EtatVoyage } from "./mock-voyages";

/**
 * Profils de test pour la phase de simulation.
 * - Marc : voyage prévu dans 3 jours (Provence)
 * - Sophie : jour 3 du voyage (Châteaux cathares)
 * - Léa : voyage terminé + 2 passés
 * - Thomas : voyage terminé (1 passé)
 * - Julie : rien — test général sans simulation
 */

export interface TestProfile {
  id: string;
  name: string;
  /** État simulé pour les tests */
  etatVoyage?: EtatVoyage;
}

export const TEST_PROFILES: TestProfile[] = [
  { id: "marc", name: "Marc", etatVoyage: "voyage_prevu" },
  { id: "sophie", name: "Sophie", etatVoyage: "voyage_en_cours" },
  { id: "lea", name: "Léa", etatVoyage: "voyage_termine" },
  { id: "thomas", name: "Thomas", etatVoyage: "voyage_termine" },
  { id: "julie", name: "Julie", etatVoyage: "rien" },
];

/** Liste des ids valides pour le cookie (middleware). */
export const VALID_PROFILE_IDS = TEST_PROFILES.map((p) => p.id);

export function getProfileById(id: string): TestProfile | undefined {
  return TEST_PROFILES.find((p) => p.id === id);
}

/** Clé localStorage pour les réponses quiz d'un profil (phase test). */
export function getQuizStorageKey(profileId: string): string {
  return `quiz_${profileId}`;
}
