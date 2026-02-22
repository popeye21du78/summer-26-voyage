/**
 * Nombre d'entrées patrimoine par tier (Passe 2).
 * Plafond strict : on demande un TOP 15 à 20, pas des dizaines. Plages/randos = profils JSON.
 */
export const TIER_EFFECTIFS = {
  S: { patrimoine: 20, pepites_min: 5 },
  A: { patrimoine: 18, pepites_min: 4 },
  B: { patrimoine: 15, pepites_min: 3 },
  C: { patrimoine: 12, pepites_min: 2 },
  D: { patrimoine: 10, pepites_min: 1 },
} as const;

export type Tier = keyof typeof TIER_EFFECTIFS;
