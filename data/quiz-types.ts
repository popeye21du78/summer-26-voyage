/**
 * Schémas des réponses quiz (identité + pré-voyage).
 * Structure alignée sur l'arborescence définie.
 */

/** Préférence tri-état (oui / non / peu importe) */
export type TriPreference = "oui" | "non" | "peu_importe";

/** Niveau d'envie pour l'ambiance (Option 2) */
export type NiveauAmbiance = "beaucoup" | "un_peu" | "passer";

/** Répartition ambiance : Beaucoup (35%), Un peu (15%), Passer (0%), puis normalisation. */
export interface AmbiancesRepartition {
  chateaux?: NiveauAmbiance;
  villages?: NiveauAmbiance;
  villes?: NiveauAmbiance;
  musees?: NiveauAmbiance;
  randos?: NiveauAmbiance;
  plages?: NiveauAmbiance;
}

/** Proportions normalisées (0-100, somme = 100) pour chaque type. */
export interface AmbiancesProportions {
  chateaux: number;
  villages: number;
  villes: number;
  musees: number;
  randos: number;
  plages: number;
}

/** Amateur en histoire ou non — pour adapter les descriptions des villes */
export type AmateurHistoire = "oui" | "non";

/** Budget restos — rat ou un peu de budget */
export type BudgetRestos = "rat" | "un_peu_de_budget";

/** Quiz d'identité — simplifié : perso de base, modifiable via « Modifier ma perso ». */
export interface QuizIdentiteAnswers {
  prenom?: string;
  ageTranche?: "18-25" | "26-35" | "36-50" | "50+";
  possedeVan?: boolean;
  /** Amateur en histoire ? Pour adapter les descriptions des villes */
  amateurHistoire?: AmateurHistoire;
  /** Budget restos : rat ou ça va j'ai un peu de budget */
  budgetRestos?: BudgetRestos;
}

/** Activité principale du voyage (Étape 1). */
export type ActivitePrincipale =
  | "plages_uniquement"
  | "randos_uniquement"
  | "villes_villages"
  | "mix";

/** Types d'étapes sélectionnables dans le mixeur (nouvelle UI). */
export type EtapeType = "plages" | "randos" | "villages" | "villes" | "chateaux" | "musees";

/** Niveau du mixeur (0–3) : 0 pas du tout, 1 un peu, 2 souvent, 3 à fond */
export type MixeurNiveau = 0 | 1 | 2 | 3;

export interface MixeurEtapesNiveaux {
  plages?: MixeurNiveau;
  randos?: MixeurNiveau;
  villages?: MixeurNiveau;
  villes?: MixeurNiveau;
  chateaux?: MixeurNiveau;
  musees?: MixeurNiveau;
}

/** Types de plages tels que présents dans `lieux-central` */
export type PlageType =
  | "grande_plage"
  | "crique"
  | "calanque"
  | "plage_lac";

/** Cadres/environnements (mapping vers tags_cadre) */
export type CadreOption =
  | "bord_de_mer"
  | "montagne"
  | "vignoble"
  | "campagne"
  | "lac"
  | "grandes_villes";

/** Quiz pré-voyage — arborescence conditionnelle. */
export interface QuizPreVoyageAnswers {
  // Étape 0 — Cadrage
  dureeJours?: number;
  etapesParJour?: 1 | 2 | 3;
  pointDepart?: string;
  avecQui?: "solo" | "couple" | "famille" | "amis";

  /**
   * Étape 1 — (ancienne UI) Activité principale.
   * Gardée pour compat avec les réponses stockées (localStorage).
   */
  activitePrincipale?: ActivitePrincipale;

  /**
   * Étape 1 — (nouvelle UI) Mixeur 0–3 par type.
   * Une étape est considérée "incluse" si son niveau > 0.
   */
  mixeurEtapes?: MixeurEtapesNiveaux;

  /** Choix des régions : l'utilisateur a-t-il de l'inspiration ? */
  regionsInspiration?: "jai_une_idee" | "pas_d_inspi";

  // Tiroirs (ancienne UI, si pertinent) — gardés pour compat
  plagesType?: "sable" | "galets" | "les_deux";
  plagesAmbiance?: "familiale" | "sauvage" | "les_deux";
  plagesActivite?: "bain" | "surf" | "voile" | "rien";
  randosNiveau?: "debutant" | "intermediaire" | "confirme" | "tous";
  randosPaysage?: "littoral" | "montagne" | "gorges" | "foret" | "peu_importe";
  villagesOuVilles?: "grandes_villes" | "villages" | "les_deux";

  // Tiroirs (nouvelle UI) — préférences plages / randos (utilisent les colonnes de lieux-central)
  plageTypes?: PlageType[]; // vide/undefined = peu importe
  plageSurf?: TriPreference;
  plageNaturiste?: TriPreference;
  plageFamiliale?: TriPreference;

  randoNiveauSouhaite?: "facile" | "modere" | "difficile" | "peu_importe";
  randoDuree?: "courte" | "moyenne" | "longue" | "peu_importe";
  randoDenivele?: "faible" | "moyen" | "fort" | "peu_importe";

  // Région(s)
  region?: string;
  regions?: string[]; // multi-sélection

  /**
   * Cadre (environnements).
   * - Saisi AVANT les régions uniquement si regionsInspiration = "pas_d_inspi" (aide au choix)
   * - Saisi EN FIN uniquement si voyage court et regionsInspiration !== "pas_d_inspi"
   */
  cadresChoisis?: CadreOption[];

  // Pépites vs classiques (pour les villes)
  pepitesPourcent?: number; // 0–100 : curseur pépites vs incontournables
  /** Malus appliqué aux grandes villes si true */
  eviterGrandesVilles?: boolean;

  // Goûts architecturaux (déplacé depuis identité)
  goutArchitecture?: ("colombages" | "vieilles_pierres" | "brique" | "ardoise" | "je_men_fiche")[];

  // Ambiance (Option 2) — Beaucoup / Un peu / Passer
  ambiances?: AmbiancesRepartition;

  // Dérivés (calculés à la soumission)
  rythme?: "cool" | "normal" | "intense"; // dérivé de etapesParJour
  budget?: "je_depense_pas" | "raisonnable" | "je_me_fais_plaisir";
  activitesPrioritaires?: ("plages" | "randos" | "villages" | "patrimoine" | "gastronomie" | "musees")[];
  mood?: "contemplatif" | "aventurier" | "gourmand" | "culturel";
  hebergement?: {
    airbnb?: number;
    camping?: number;
    vanSauvage?: number;
  };
}

export interface QuizIdentitePayload {
  profileId: string;
  updatedAt: string;
  answers: QuizIdentiteAnswers;
}

export interface QuizPreVoyagePayload {
  voyageId?: string;
  updatedAt: string;
  answers: QuizPreVoyageAnswers;
}
