/**
 * Schémas des réponses quiz (identité + pré-voyage).
 * Aligné sur PROJET-VISION-COMPLETE.md.
 */

/** Quiz d'identité — une fois, modifiable via « Modifier ma perso ». */
export interface QuizIdentiteAnswers {
  prenom?: string;
  ageTranche?: "18-25" | "26-35" | "36-50" | "50+";
  villeOrigine?: string;
  avecQui?: "solo" | "couple" | "famille" | "amis";
  goutArchitecture?: ("colombages" | "vieilles_pierres" | "brique" | "ardoise" | "je_men_fiche")[];
  rapportMer?: number; // 0–10
  rapportMontagne?: number;
  rapportCampagne?: number;
  rapportVille?: number;
  rythme?: "roule_beaucoup" | "deux_etapes_max";
  budget?: "je_depense_pas" | "raisonnable" | "je_me_fais_plaisir";
  incontournablesVsPepites?: "classiques" | "meconnu" | "mix";
}

/** Quiz pré-voyage — 5–8 questions par voyage. */
export interface QuizPreVoyageAnswers {
  region?: string; // ex. "Occitanie", "peu importe"
  rythme?: "cool" | "normal" | "intense";
  activitesPrioritaires?: ("plages" | "randos" | "villages" | "patrimoine" | "gastronomie" | "musees")[];
  mood?: "contemplatif" | "aventurier" | "gourmand" | "culturel";
  avecQui?: "solo" | "couple" | "famille" | "amis";
  hebergement?: {
    airbnb?: number;
    camping?: number;
    vanSauvage?: number;
  }; // % (total = 100)
  dureeJours?: number;
  pointDepart?: string; // ville de départ
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
