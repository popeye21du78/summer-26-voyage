/**
 * API geo.api.gouv.fr (découpage administratif) : à partir de lat/lon, récupère
 * la commune (nom, code département, nom département, population).
 * Pas de clé API requise.
 */

const API_BASE = "https://geo.api.gouv.fr/communes";

export interface CommuneInsee {
  nom: string;
  codeDepartement: string;
  departement: string;
  population: number | null;
}

/**
 * Recherche par coordonnées : retourne la commune contenant le point (lat, lng).
 */
export async function getCommuneByCoord(
  lat: number,
  lon: number
): Promise<CommuneInsee | null> {
  try {
    const url = new URL(API_BASE);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set(
      "fields",
      "nom,codeDepartement,departement,population"
    );

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      nom?: string;
      codeDepartement?: string;
      departement?: { code?: string; nom?: string };
      population?: number;
    }>;

    const first = data[0];
    if (!first) return null;

    const departement =
      typeof first.departement === "object" && first.departement?.nom
        ? first.departement.nom
        : "";

    return {
      nom: first.nom ?? "",
      codeDepartement: first.codeDepartement ?? "",
      departement,
      population: typeof first.population === "number" ? first.population : null,
    };
  } catch {
    return null;
  }
}
