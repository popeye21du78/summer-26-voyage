/**
 * Nombre d'entrées attendues par tier (pour la Passe 2).
 * Utilisé en lisant data/departements/classement.json puis en appliquant ce mapping.
 */
export const TIER_EFFECTIFS = {
  S: { patrimoine: 48, pepites: 15, plages: 12, randonnees: 12 },
  A: { patrimoine: 35, pepites: 10, plages: 10, randonnees: 10 },
  B: { patrimoine: 25, pepites: 8, plages: 8, randonnees: 8 },
  C: { patrimoine: 18, pepites: 5, plages: 5, randonnees: 5 },
  D: { patrimoine: 12, pepites: 3, plages: 3, randonnees: 5 },
} as const;

export type Tier = keyof typeof TIER_EFFECTIFS;
