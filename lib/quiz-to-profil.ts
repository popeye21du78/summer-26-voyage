/**
 * Mapping Quiz (identité + pré-voyage) → profil de recherche.
 * Pure code, pas d'IA. Utilisé pour le compte rendu et le scoring des lieux.
 * Cadre et architecture : déplacés du quiz identité vers le quiz voyage.
 */

import type {
  QuizIdentiteAnswers,
  QuizPreVoyageAnswers,
  AmateurHistoire,
  BudgetRestos,
  MixeurEtapesNiveaux,
  MixeurNiveau,
  PlageType,
  TriPreference,
} from "../data/quiz-types";
import { computeAmbiancesProportions } from "./ambiance-proportions";

/** Région → codes départements (2 chiffres, ex. "01") */
const REGION_TO_DEPARTEMENTS: Record<string, string[]> = {
  "Peu importe": [],
  Occitanie: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "Provence-Alpes-Côte d'Azur": ["04", "05", "06", "13", "83", "84"],
  Bretagne: ["22", "29", "35", "56"],
  Normandie: ["14", "27", "50", "61", "76"],
  Loire: ["44", "49", "53", "72", "85"],
  "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
  Alsace: ["67", "68"],
  "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
};

/** Mapping cadresChoisis (quiz voyage) → tags_cadre */
const CADRE_TO_TAGS: Record<string, { tag: string; poids: number }[]> = {
  bord_de_mer: [{ tag: "bord_de_mer", poids: 1 }],
  montagne: [
    { tag: "moyenne_montagne", poids: 0.9 },
    { tag: "haute_montagne", poids: 0.9 },
  ],
  vignoble: [{ tag: "vignoble", poids: 1 }],
  campagne: [
    { tag: "plaine", poids: 0.8 },
    { tag: "colline", poids: 0.8 },
    { tag: "foret", poids: 0.7 },
    { tag: "riviere", poids: 0.6 },
  ],
  lac: [{ tag: "lac", poids: 1 }],
  grandes_villes: [{ tag: "plaine", poids: 0.6 }], // villes souvent en plaine
};

export interface ProfilRecherche {
  tagsCadre: { tag: string; poids: number }[];
  tagsArchitecture: string[];
  /** Types famille_type/source_type à inclure (plages, randos, chateaux, villages, villes, musees) */
  famillesIncluses: string[];
  region?: string;
  regions?: string[];
  departements?: string[];
  /** 0–100 : pépites vs classiques (pour les villes) */
  pepitesPourcent: number;
  notoriete: "classiques" | "meconnu" | "mix";
  /** Malus aux grandes villes si true */
  eviterGrandesVilles: boolean;
  dureeJours: number;
  pointDepart?: string;
  rythme: "cool" | "normal" | "intense";
  mood?: "contemplatif" | "aventurier" | "gourmand" | "culturel";
  /** Amateur en histoire ? Pour adapter les descriptions des villes */
  amateurHistoire?: AmateurHistoire;
  /** Budget restos : rat ou un peu de budget */
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

  // Préférences plages (match sur colonnes lieux-central)
  plageTypes?: PlageType[];
  plageSurf?: TriPreference;
  plageNaturiste?: TriPreference;
  plageFamiliale?: TriPreference;

  // Préférences randos (match sur colonnes lieux-central)
  randoNiveauSouhaite?: "facile" | "modere" | "difficile" | "peu_importe";
  randoDuree?: "courte" | "moyenne" | "longue" | "peu_importe";
  randoDenivele?: "faible" | "moyen" | "fort" | "peu_importe";

  /** Nombre max de nuits en Airbnb toléré (0 = tout en van, undefined = pas de limite) */
  maxAirbnbNights?: number;
}

const MIXEUR_TYPES = ["plages", "randos", "chateaux", "villages", "villes", "musees"] as const;

function mixeurLevelToWeight(lvl: MixeurNiveau): number {
  // 0–3 → poids simple. On garde linéaire pour l'instant (peut être ajusté).
  return lvl;
}

function computeProportionsFromMixeur(mixeur: MixeurEtapesNiveaux): ProfilRecherche["proportionsAmbiance"] | null {
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

  // Ajustement : assurer somme = 100 (corriger l'arrondi sur la plus grosse part)
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

function computeFamillesIncluses(prevoyage: Partial<QuizPreVoyageAnswers>): string[] {
  const familles: string[] = [];

  // Priorité à la nouvelle UI : mixeur
  const mixeur = prevoyage.mixeurEtapes;
  if (mixeur && MIXEUR_TYPES.some((k) => (mixeur[k] ?? 0) > 0)) {
    if ((mixeur.plages ?? 0) > 0) familles.push("plage");
    if ((mixeur.randos ?? 0) > 0) familles.push("rando", "site_naturel");
    if ((mixeur.chateaux ?? 0) > 0) familles.push("chateau", "abbaye");
    if ((mixeur.villages ?? 0) > 0) familles.push("village");
    if ((mixeur.villes ?? 0) > 0) familles.push("ville");
    if ((mixeur.musees ?? 0) > 0) familles.push("musee");

    // Patrimoine = "culture" générique : on l'inclut si on a sélectionné un type culture (hors plages/randos uniquement)
    const culture = (mixeur.villages ?? 0) > 0 || (mixeur.villes ?? 0) > 0 || (mixeur.chateaux ?? 0) > 0 || (mixeur.musees ?? 0) > 0;
    if (culture) familles.push("patrimoine");

    return Array.from(new Set(familles));
  }

  // Fallback : ancienne UI Ambiance (Beaucoup/Un peu/Passer)
  const ambiances = prevoyage.ambiances;
  if (ambiances) {
    if ((ambiances.plages ?? "passer") !== "passer") familles.push("plage");
    if ((ambiances.randos ?? "passer") !== "passer") familles.push("rando", "site_naturel");
    if ((ambiances.chateaux ?? "passer") !== "passer") familles.push("chateau", "abbaye");
    if ((ambiances.villages ?? "passer") !== "passer") familles.push("village", "patrimoine");
    if ((ambiances.villes ?? "passer") !== "passer") familles.push("ville", "patrimoine");
    if ((ambiances.musees ?? "passer") !== "passer") familles.push("musee", "patrimoine");
    return Array.from(new Set(familles));
  }

  // Fallback final : ancienne activité principale
  const activitePrincipale = prevoyage.activitePrincipale;
  if (activitePrincipale === "plages_uniquement") {
    familles.push("plage");
  } else if (activitePrincipale === "randos_uniquement") {
    familles.push("rando", "site_naturel");
  } else if (activitePrincipale === "villes_villages") {
    if (prevoyage.villagesOuVilles === "grandes_villes") familles.push("ville", "patrimoine");
    else if (prevoyage.villagesOuVilles === "villages") familles.push("village", "patrimoine");
    else familles.push("ville", "village", "chateau", "abbaye", "musee", "patrimoine");
  } else {
    familles.push("plage", "rando", "ville", "village", "chateau", "abbaye", "musee", "site_naturel", "patrimoine");
  }
  return Array.from(new Set(familles));
}

export function quizToProfilRecherche(
  identite: Partial<QuizIdentiteAnswers>,
  prevoyage: Partial<QuizPreVoyageAnswers>
): ProfilRecherche {
  const tagsCadre: { tag: string; poids: number }[] = [];
  const tagsArchitecture: string[] = [];
  const famillesIncluses: string[] = computeFamillesIncluses(prevoyage);

  // --- Cadre : depuis cadresChoisis (Quiz Voyage) uniquement ---
  const cadresChoisis = prevoyage.cadresChoisis ?? [];
  for (const c of cadresChoisis) {
    const mapping = CADRE_TO_TAGS[c];
    if (mapping) {
      for (const { tag, poids } of mapping) {
        const existing = tagsCadre.find((t) => t.tag === tag);
        if (!existing) tagsCadre.push({ tag, poids });
        else existing.poids = Math.max(existing.poids, poids);
      }
    }
  }

  // --- Architecture : goutArchitecture (déplacé dans Quiz Voyage, optionnel) ---
  const gouts = prevoyage.goutArchitecture ?? [];
  if (gouts.includes("colombages")) tagsArchitecture.push("colombages");
  if (gouts.includes("vieilles_pierres")) {
    tagsArchitecture.push("pierres_blanches", "medieval", "roman", "romanesque");
  }
  if (gouts.includes("brique")) tagsArchitecture.push("brique");
  if (gouts.includes("ardoise")) tagsArchitecture.push("ardoise");

  // --- Région(s) ---
  const regionsChoisies = prevoyage.regions ?? [];
  const departements =
    regionsChoisies.length > 0
      ? regionsChoisies.flatMap((r) => REGION_TO_DEPARTEMENTS[r] ?? [])
      : prevoyage.region && prevoyage.region !== "Peu importe"
        ? REGION_TO_DEPARTEMENTS[prevoyage.region] ?? []
        : undefined;
  const region = regionsChoisies[0] ?? (prevoyage.region !== "Peu importe" ? prevoyage.region : undefined);
  const regions = regionsChoisies.length > 0 ? regionsChoisies : undefined;

  // --- Pépites : pepitesPourcent 0–100, notoriete dérivée ---
  const pepitesPourcent = prevoyage.pepitesPourcent ?? 50;
  const notoriete =
    pepitesPourcent <= 33 ? "classiques" : pepitesPourcent <= 66 ? "mix" : "meconnu";

  const eviterGrandesVilles = prevoyage.eviterGrandesVilles ?? false;

  // --- Proportions ambiance ---
  const proportionsAmbiance =
    prevoyage.mixeurEtapes
      ? computeProportionsFromMixeur(prevoyage.mixeurEtapes) ?? computeAmbiancesProportions(prevoyage.ambiances)
      : computeAmbiancesProportions(prevoyage.ambiances);

  // --- Autres ---
  const dureeJours = prevoyage.dureeJours ?? 7;
  const pointDepart = prevoyage.pointDepart?.trim() || undefined;
  const etapes = prevoyage.etapesParJour ?? 2;
  const rythme = etapes === 1 ? "cool" : etapes === 2 ? "normal" : "intense";
  const mood = prevoyage.mood;

  const prenom = identite.prenom || "Voyageur";
  const compteRendu = buildCompteRendu({
    prenom,
    identite,
    prevoyage,
    tagsCadre,
    tagsArchitecture,
    famillesIncluses,
    region,
    regions,
    notoriete,
    pepitesPourcent,
    eviterGrandesVilles,
    dureeJours,
    pointDepart,
    rythme,
    mood,
    proportionsAmbiance: proportionsAmbiance ?? undefined,
  });

  return {
    tagsCadre,
    tagsArchitecture,
    famillesIncluses,
    region,
    regions,
    departements,
    pepitesPourcent,
    notoriete,
    eviterGrandesVilles,
    dureeJours,
    pointDepart,
    rythme,
    mood,
    amateurHistoire: identite.amateurHistoire,
    budgetRestos: identite.budgetRestos,
    compteRendu,
    ...(proportionsAmbiance && { proportionsAmbiance }),

    plageTypes: prevoyage.plageTypes,
    plageSurf: prevoyage.plageSurf,
    plageNaturiste: prevoyage.plageNaturiste,
    plageFamiliale: prevoyage.plageFamiliale,

    randoNiveauSouhaite: prevoyage.randoNiveauSouhaite,
    randoDuree: prevoyage.randoDuree,
    randoDenivele: prevoyage.randoDenivele,

    maxAirbnbNights: prevoyage.maxAirbnbNights ?? prevoyage.hebergement?.airbnb,
  };
}

interface CompteRenduParams {
  prenom: string;
  identite: Partial<QuizIdentiteAnswers>;
  prevoyage: Partial<QuizPreVoyageAnswers>;
  tagsCadre: { tag: string; poids: number }[];
  tagsArchitecture: string[];
  famillesIncluses: string[];
  region?: string;
  regions?: string[];
  notoriete: string;
  pepitesPourcent: number;
  eviterGrandesVilles: boolean;
  dureeJours: number;
  pointDepart?: string;
  rythme: string;
  mood?: string;
  proportionsAmbiance?: {
    chateaux: number;
    villages: number;
    villes: number;
    musees: number;
    randos: number;
    plages: number;
  };
}

function buildCompteRendu(p: CompteRenduParams): string {
  const lignes: string[] = [];

  lignes.push(`Profil de recherche pour ${p.prenom} — ce voyage`);
  lignes.push("");

  if (p.identite.amateurHistoire || p.identite.budgetRestos) {
    const parts: string[] = [];
    if (p.identite.amateurHistoire) {
      const labels: Record<string, string> = {
        oui: "amateur (descriptions adaptées)",
        non: "non amateur",
      };
      parts.push(`Histoire : ${labels[p.identite.amateurHistoire] ?? p.identite.amateurHistoire}`);
    }
    if (p.identite.budgetRestos) {
      const labels: Record<string, string> = {
        rat: "rat",
        un_peu_de_budget: "ça va, j'ai un peu de budget",
      };
      parts.push(`Restos : ${labels[p.identite.budgetRestos] ?? p.identite.budgetRestos}`);
    }
    if (parts.length > 0) lignes.push(parts.join(" | "));
    lignes.push("");
  }

  if (p.tagsCadre.length > 0) {
    const tags = p.tagsCadre.map((t) => `${t.tag} (×${t.poids.toFixed(1)})`).join(", ");
    lignes.push("Environnements recherchés : " + tags);
  }

  if (p.tagsArchitecture.length > 0) {
    lignes.push("Architecture : " + p.tagsArchitecture.join(", "));
  }

  lignes.push("Types inclus : " + p.famillesIncluses.join(", "));
  lignes.push("");

  lignes.push(`Pépites : ${p.pepitesPourcent}% (${p.notoriete}) — s’applique aux villes ET villages`);
  lignes.push("Règle : une “pépite” est un lieu pas trop connu (notoriété ajustée < 6), avec une tolérance pour les petits lieux (alpha=3).");
  lignes.push("Garde-fou : si manque de pépites, on peut compléter avec des Plus Beaux Villages de France (PBVF).");
  if (p.eviterGrandesVilles) {
    lignes.push("Malus appliqué aux grandes villes.");
  }
  lignes.push("");

  if (p.regions && p.regions.length > 0) {
    lignes.push("Régions ciblées : " + p.regions.join(", "));
  } else if (p.region) {
    lignes.push("Région ciblée : " + p.region);
  } else {
    lignes.push("Région : toute la France");
  }
  lignes.push("");

  if (p.proportionsAmbiance) {
    const parts: string[] = [];
    if (p.proportionsAmbiance.plages > 0) parts.push(`plages ${p.proportionsAmbiance.plages}%`);
    if (p.proportionsAmbiance.randos > 0) parts.push(`randos ${p.proportionsAmbiance.randos}%`);
    if (p.proportionsAmbiance.chateaux > 0) parts.push(`châteaux ${p.proportionsAmbiance.chateaux}%`);
    if (p.proportionsAmbiance.villages > 0) parts.push(`villages ${p.proportionsAmbiance.villages}%`);
    if (p.proportionsAmbiance.villes > 0) parts.push(`villes ${p.proportionsAmbiance.villes}%`);
    if (p.proportionsAmbiance.musees > 0) parts.push(`musées ${p.proportionsAmbiance.musees}%`);
    if (parts.length > 0) lignes.push("Répartition : " + parts.join(", "));
  }

  lignes.push("");
  lignes.push(`Durée : ${p.dureeJours} jours | Rythme : ${p.rythme}`);
  if (p.pointDepart) lignes.push(`Point de départ : ${p.pointDepart}`);

  return lignes.join("\n");
}
