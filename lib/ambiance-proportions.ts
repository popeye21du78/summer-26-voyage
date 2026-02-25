import type { AmbiancesRepartition, AmbiancesProportions, NiveauAmbiance } from "@/data/quiz-types";

/** Valeur brute avant normalisation : Beaucoup 35%, Un peu 15%, Passer 0% */
const NIVEAUX_VALEURS: Record<NiveauAmbiance, number> = {
  beaucoup: 35,
  un_peu: 15,
  passer: 0,
};

const TYPES = ["chateaux", "villages", "villes", "musees", "randos", "plages"] as const;

/**
 * Calcule les proportions normalisées (0–100, somme = 100) à partir des ambiances.
 * Si tous les types sont « Passer », renvoie des parts égales.
 */
export function computeAmbiancesProportions(
  ambiances?: AmbiancesRepartition | null
): AmbiancesProportions | null {
  if (!ambiances) return null;

  const brutes: Record<string, number> = {};
  for (const t of TYPES) {
    const niveau = ambiances[t as keyof AmbiancesRepartition] ?? "passer";
    brutes[t] = NIVEAUX_VALEURS[niveau as NiveauAmbiance] ?? 0;
  }

  const somme = Object.values(brutes).reduce((a, b) => a + b, 0);
  if (somme <= 0) {
    return {
      chateaux: 17,
      villages: 17,
      villes: 16,
      musees: 17,
      randos: 17,
      plages: 16,
    };
  }

  return {
    chateaux: Math.round((100 * brutes.chateaux) / somme),
    villages: Math.round((100 * brutes.villages) / somme),
    villes: Math.round((100 * brutes.villes) / somme),
    musees: Math.round((100 * brutes.musees) / somme),
    randos: Math.round((100 * brutes.randos) / somme),
    plages: Math.round((100 * brutes.plages) / somme),
  };
}
