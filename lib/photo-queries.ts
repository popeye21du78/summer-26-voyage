/**
 * Requêtes Unsplash optimisées par ville.
 * Meilleurs résultats visuels, en évitant les photos de lampadaires / détails urbains.
 *
 * Clé = nom normalisé (minuscules, sans accents pour matching).
 * Valeur = requêtes à essayer dans l'ordre (cascade).
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Requêtes optimisées : lieux emblématiques, vues générales (éviter lampadaires) */
const QUERIES: Record<string, string[]> = {
  prefailles: [
    "Préfailles Loire-Atlantique plage bord de mer",
    "Préfailles côte Atlantique",
    "Loire-Atlantique plage côte",
  ],
  toulon: [
    "Toulon port rade Méditerranée",
    "Toulon rade vue mer",
    "Toulon Provence port",
  ],
  agen: [
    "Agen Lot-et-Garonne canal pont",
    "Lot-et-Garonne paysage France",
    "Agen Garonne",
  ],
  marseille: [
    "Marseille Vieux-Port Méditerranée",
    "Marseille calanques",
    "Marseille Notre-Dame Garde",
  ],
  paris: [
    "Paris Tour Eiffel Seine",
    "Paris monuments",
    "Paris Notre-Dame",
  ],
  bordeaux: [
    "Bordeaux place Bourse miroir eau",
    "Bordeaux Garonne quais",
  ],
  biarritz: [
    "Biarritz plage océan",
    "Biarritz côte basque",
  ],
};

/** Départements par ville (pour fallback) */
const DEPARTEMENTS: Record<string, string> = {
  prefailles: "Loire-Atlantique",
  toulon: "Var",
  agen: "Lot-et-Garonne",
  marseille: "Bouches-du-Rhône",
  paris: "Paris",
  bordeaux: "Gironde",
  biarritz: "Pyrénées-Atlantiques",
};

export function getPhotoQueries(ville: string, stepId?: string): string[] {
  const key = normalize(stepId ?? ville);
  const custom = QUERIES[key];
  if (custom?.length) return custom;

  // Fallback générique : lieux, paysage (éviter "rue" seul → lampadaires)
  return [
    `${ville} France paysage`,
    `${ville} monuments vue`,
    DEPARTEMENTS[key] ? `${DEPARTEMENTS[key]} paysage France` : `${ville}`,
  ];
}
