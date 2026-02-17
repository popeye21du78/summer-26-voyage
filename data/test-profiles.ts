/**
 * Profils de test pour la phase de simulation.
 * Au login, l'utilisateur choisit l'un de ces profils.
 * Plus tard : les réponses aux quiz construiront une "personnalité du voyageur" (ex. 16 types sur 4 axes).
 */

export interface TestProfile {
  id: string;
  name: string;
}

export const TEST_PROFILES: TestProfile[] = [
  { id: "marc", name: "Marc" },
  { id: "sophie", name: "Sophie" },
  { id: "lea", name: "Léa" },
  { id: "thomas", name: "Thomas" },
  { id: "julie", name: "Julie" },
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
