/**
 * Crée data/cities/lieux-central.xlsx avec 3 onglets (Patrimoine, Plages, Randos)
 * et en-têtes uniquement. v4 : patrimoine fusionné, plages/randos simplifiés.
 *
 * Usage : npx tsx scripts/create-lieux-central-xlsx.ts
 */

import * as XLSX from "xlsx";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "cities");
const OUT_PATH = join(DATA_DIR, "lieux-central.xlsx");

const PATRIMOINE_HEADERS = [
  "code_dep",
  "departement",
  "nom",
  "slug",
  "nom_geocodage",
  "type_precis",
  "tags_architecture",
  "tags_cadre",
  "score_esthetique",
  "score_notoriete",
  "plus_beaux_villages",
  "description_courte",
  "activites_notables",
  "lat",
  "lng",
  "population",
  "categorie_taille",
  "unesco",
  "site_classe",
];

const PLAGES_HEADERS = [
  "code_dep",
  "departement",
  "nom",
  "slug",
  "nom_geocodage",
  "commune",
  "type_plage",
  "surf",
  "naturiste",
  "familiale",
  "justification",
  "lat",
  "lng",
];

const RANDOS_HEADERS = [
  "code_dep",
  "departement",
  "nom",
  "slug",
  "commune_depart",
  "justification",
  "niveau_souhaite",
  "difficulte",
  "denivele_positif_m",
  "distance_km",
  "duree_estimee",
  "point_depart_precis",
  "parking_info",
  "url_trace",
  "gpx_url",
  "lat_depart",
  "lng_depart",
];

function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const wb = XLSX.utils.book_new();

  const sheetPatrimoine = XLSX.utils.aoa_to_sheet([PATRIMOINE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetPatrimoine, "Patrimoine");

  const sheetPlages = XLSX.utils.aoa_to_sheet([PLAGES_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetPlages, "Plages");

  const sheetRandos = XLSX.utils.aoa_to_sheet([RANDOS_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetRandos, "Randos");

  XLSX.writeFile(wb, OUT_PATH);
  console.log("Créé:", OUT_PATH);
  console.log("3 onglets: Patrimoine, Plages, Randos (en-têtes uniquement).");
}

main();
