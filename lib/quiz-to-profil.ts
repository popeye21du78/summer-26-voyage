/**
 * Types et helpers pour le profil de recherche (scoring des lieux via /api/score-lieux).
 * Le mapping complet depuis le quiz pré-voyage a été retiré — à reconstruire proprement.
 */

import type {
  AmateurHistoire,
  BudgetRestos,
  MixeurEtapesNiveaux,
  MixeurNiveau,
  PlageType,
  TriPreference,
} from "../data/quiz-types";

export interface ProfilRecherche {
  tagsCadre: { tag: string; poids: number }[];
  tagsArchitecture: string[];
  famillesIncluses: string[];
  region?: string;
  regions?: string[];
  departements?: string[];
  pepitesPourcent: number;
  notoriete: "classiques" | "meconnu" | "mix";
  eviterGrandesVilles: boolean;
  dureeJours: number;
  pointDepart?: string;
  rythme: "cool" | "normal" | "intense";
  mood?: "contemplatif" | "aventurier" | "gourmand" | "culturel";
  amateurHistoire?: AmateurHistoire;
  budgetRestos?: BudgetRestos;
  compteRendu: string;
  proportionsAmbiance?: {
    chateaux: number;
    villages: number;
    villes: number;
    musees: number;
    randos: number;
    plages: number;
  };
  plageTypes?: PlageType[];
  plageSurf?: TriPreference;
  plageNaturiste?: TriPreference;
  plageFamiliale?: TriPreference;
  randoNiveauSouhaite?: "facile" | "modere" | "difficile" | "peu_importe";
  randoDuree?: "courte" | "moyenne" | "longue" | "peu_importe";
  randoDenivele?: "faible" | "moyen" | "fort" | "peu_importe";
  maxAirbnbNights?: number;
  mixeurEtapes?: MixeurEtapesNiveaux;
}

const MIXEUR_TYPES = ["plages", "randos", "chateaux", "villages", "villes", "musees"] as const;

function mixeurLevelToWeight(lvl: MixeurNiveau): number {
  return lvl;
}

export function famillesInclusesFromMixeur(mixeur: MixeurEtapesNiveaux): string[] {
  const familles: string[] = [];
  if (!mixeur || !MIXEUR_TYPES.some((k) => (mixeur[k] ?? 0) > 0)) return familles;
  if ((mixeur.plages ?? 0) > 0) familles.push("plage");
  if ((mixeur.randos ?? 0) > 0) familles.push("rando", "site_naturel");
  if ((mixeur.chateaux ?? 0) > 0) familles.push("chateau", "abbaye");
  if ((mixeur.villages ?? 0) > 0) familles.push("village");
  if ((mixeur.villes ?? 0) > 0) familles.push("ville");
  if ((mixeur.musees ?? 0) > 0) familles.push("musee");
  const culture =
    (mixeur.villages ?? 0) > 0 ||
    (mixeur.villes ?? 0) > 0 ||
    (mixeur.chateaux ?? 0) > 0 ||
    (mixeur.musees ?? 0) > 0;
  if (culture) familles.push("patrimoine");
  return Array.from(new Set(familles));
}

export function inferMixLevelsFromProportions(
  p: NonNullable<ProfilRecherche["proportionsAmbiance"]>
): MixeurEtapesNiveaux {
  const keys = MIXEUR_TYPES;
  const vals = keys.map((k) => p[k] ?? 0);
  const maxV = Math.max(...vals, 1e-6);
  const out: MixeurEtapesNiveaux = {};
  for (const k of keys) {
    const v = p[k] ?? 0;
    if (v <= 0) out[k] = 0;
    else {
      const ratio = v / maxV;
      if (ratio < 0.34) out[k] = 1;
      else if (ratio < 0.67) out[k] = 2;
      else out[k] = 3;
    }
  }
  return out;
}

export function computeProportionsFromMixeur(
  mixeur: MixeurEtapesNiveaux
): ProfilRecherche["proportionsAmbiance"] | null {
  const weights: Record<(typeof MIXEUR_TYPES)[number], number> = {
    plages: mixeurLevelToWeight((mixeur.plages ?? 0) as MixeurNiveau),
    randos: mixeurLevelToWeight((mixeur.randos ?? 0) as MixeurNiveau),
    chateaux: mixeurLevelToWeight((mixeur.chateaux ?? 0) as MixeurNiveau),
    villages: mixeurLevelToWeight((mixeur.villages ?? 0) as MixeurNiveau),
    villes: mixeurLevelToWeight((mixeur.villes ?? 0) as MixeurNiveau),
    musees: mixeurLevelToWeight((mixeur.musees ?? 0) as MixeurNiveau),
  };

  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;

  const raw = {
    plages: Math.round((100 * weights.plages) / sum),
    randos: Math.round((100 * weights.randos) / sum),
    chateaux: Math.round((100 * weights.chateaux) / sum),
    villages: Math.round((100 * weights.villages) / sum),
    villes: Math.round((100 * weights.villes) / sum),
    musees: Math.round((100 * weights.musees) / sum),
  };

  const total = raw.plages + raw.randos + raw.chateaux + raw.villages + raw.villes + raw.musees;
  const delta = 100 - total;
  if (delta !== 0) {
    const entries = Object.entries(raw) as Array<[keyof typeof raw, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const k = entries[0]?.[0] ?? "villages";
    raw[k] = Math.max(0, raw[k] + delta);
  }

  return {
    plages: raw.plages,
    randos: raw.randos,
    chateaux: raw.chateaux,
    villages: raw.villages,
    villes: raw.villes,
    musees: raw.musees,
  };
}
