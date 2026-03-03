/**
 * Mapping Quiz (identité + pré-voyage) → ProfilVille.
 * Utilisé pour adapter les descriptions des villes (tu/vous, genre, etc.).
 */

import type { QuizIdentiteAnswers, QuizPreVoyageAnswers } from "../data/quiz-types";
import type { ProfilVille, TypePartenaire } from "./ville-adaptation";

/** Mapping avecQui (quiz) → typePartenaire (ProfilVille) */
function avecQuiToTypePartenaire(avecQui?: string): TypePartenaire {
  switch (avecQui) {
    case "solo":
      return "seul";
    case "couple":
      return "couple";
    case "famille":
      return "famille";
    case "amis":
      return "amis";
    default:
      return "seul";
  }
}

/**
 * Construit un ProfilVille à partir des réponses quiz.
 * Utilisé pour adapter les descriptions (tu/vous, placeholders, etc.).
 */
export function quizToProfilVille(
  identite: Partial<QuizIdentiteAnswers>,
  prevoyage: Partial<QuizPreVoyageAnswers>
): ProfilVille {
  const typePartenaire = avecQuiToTypePartenaire(prevoyage.avecQui);
  const pluriel = typePartenaire === "famille" || typePartenaire === "amis";

  const p: ProfilVille = {
    genre: "homme", // non présent dans le quiz pour l'instant
    typePartenaire,
    prenom: identite.prenom?.trim() || "Voyageur",
    pluriel,
  };

  if (typePartenaire === "famille") {
    p.nbEnfants = 2;
    p.partenaire = { prenom: "compagnon", genre: "femme" };
    p.enfants = ["enfant 1", "enfant 2"];
  } else if (typePartenaire === "couple") {
    p.partenaire = { prenom: "compagnon", genre: "femme" };
  }

  return p;
}
