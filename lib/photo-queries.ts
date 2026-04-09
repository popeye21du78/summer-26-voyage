/**
 * Requêtes Unsplash par ville.
 * La **première** requête = le nom affiché tel quel (comme dans la barre de recherche sur unsplash.com),
 * puis « Nom France », puis variantes / entrées custom en secours.
 *
 * Clé = nom normalisé (minuscules, sans accents pour matching).
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dedupeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const t = q.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Comme sur unsplash.com quand on tape le lieu : beaucoup de gens écrivent « saint malo » (espaces),
 * pas « Saint-Malo » (tiret) — l’index renvoie souvent plus de résultats avec les espaces.
 */
function primaryQueriesAsOnUnsplashSite(ville: string): string[] {
  const v = ville.trim();
  if (!v) return [];
  const spaced = v.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  if (spaced !== v) {
    return dedupeQueries([spaced, v, `${spaced} France`, `${v} France`]);
  }
  return dedupeQueries([v, `${v} France`]);
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
  toulouse: [
    "Toulouse Capitole place France",
    "Toulouse Garonne river France",
    "Toulouse Haute-Garonne cityscape France",
    "Toulouse France pink city architecture",
  ],
  /** « … ville architecture » en premier attire des clichés alsaciens / colombages sur Unsplash. */
  annecy: [
    "Annecy lac d'Annecy Haute-Savoie France",
    "Lake Annecy Alps France",
    "Annecy Palais de l'Isle canal France",
    "Annecy vieille ville Haute-Savoie",
  ],
  "vieux-annecy": [
    "Annecy canal Palais de l'Isle France",
    "Vieille ville Annecy Haute-Savoie",
    "Annecy old town canals France",
  ],
  /** Slug JSON ; « ville architecture » renvoie souvent 0 sur Unsplash pour ce site. */
  "mont-saint-michel": [
    "Mont Saint-Michel abbey Normandy France",
    "Mont Saint-Michel France landmark",
    "Mont Saint-Michel bay aerial",
    "Mont Saint-Michel UNESCO",
  ],
  /** Même lieu si le nom affiché est utilisé seul comme clé. */
  "mont saint-michel": [
    "Mont Saint-Michel abbey Normandy France",
    "Mont Saint-Michel France landmark",
    "Mont Saint-Michel bay aerial",
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
  toulouse: "Haute-Garonne",
  annecy: "Haute-Savoie",
  "vieux-annecy": "Haute-Savoie",
  beziers: "Hérault",
  "saint-malo": "Ille-et-Vilaine",
  "mont-saint-michel": "Manche",
  "mont saint-michel": "Manche",
};

export function getPhotoQueries(ville: string, stepId?: string): string[] {
  const v = ville.trim();
  const key = normalize(stepId ?? ville);
  const primary = primaryQueriesAsOnUnsplashSite(v);
  const custom = QUERIES[key];

  if (custom?.length) {
    return dedupeQueries([...primary, ...custom]);
  }

  const dep = DEPARTEMENTS[key];
  const rest: string[] = [];
  if (dep) rest.push(`${v} ${dep} France`);
  rest.push(
    `${v} France city`,
    `${v} France landmarks`,
    `${v} France cityscape`,
    `${v} France centre-ville`,
    `${v} France ville architecture`
  );
  return dedupeQueries([...primary, ...rest]);
}

/** Département pour une ville (Wikipedia, fallback photo). */
export function getDepartementForVille(ville: string, stepId?: string): string | undefined {
  return DEPARTEMENTS[normalize(stepId ?? ville)];
}
