/**
 * Crée data/cities/lieux-central.xlsx avec 4 onglets (Patrimoine, Pépites, Plages, Randos)
 * et en-têtes uniquement. Une seule source pour tous les départements.
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
  "type_precis",
  "tags_architecture",
  "tags_ambiance",
  "score_esthetique",
  "score_pepite",
  "score_rando_base",
  "score_mer",
  "score_montagne",
  "score_campagne",
  "description_courte",
  "specialite_culinaire",
  "activites_notables",
  "lat",
  "lng",
  "population",
  "plus_beaux_villages",
];

const PLAGES_HEADERS = [
  "code_dep",
  "departement",
  "nom",
  "slug",
  "nom_geocodage",
  "commune",
  "proche_de_village",
  "type_plage",
  "tags_ambiance",
  "score_beaute",
  "score_baignade",
  "score_surf",
  "description_courte",
  "lat",
  "lng",
];

const RANDOS_HEADERS = [
  "code_dep",
  "departement",
  "nom",
  "slug",
  "depart_village",
  "difficulte",
  "denivele_positif_m",
  "distance_km",
  "duree_estimee",
  "tags_ambiance",
  "score_beaute_panorama",
  "score_esthetisme_trace",
  "description_courte",
  "lat_depart",
  "lng_depart",
];

function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const wb = XLSX.utils.book_new();

  const sheetPatrimoine = XLSX.utils.aoa_to_sheet([PATRIMOINE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetPatrimoine, "Patrimoine");

  const sheetPepites = XLSX.utils.aoa_to_sheet([PATRIMOINE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetPepites, "Pépites");

  const sheetPlages = XLSX.utils.aoa_to_sheet([PLAGES_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetPlages, "Plages");

  const sheetRandos = XLSX.utils.aoa_to_sheet([RANDOS_HEADERS]);
  XLSX.utils.book_append_sheet(wb, sheetRandos, "Randos");

  XLSX.writeFile(wb, OUT_PATH);
  console.log("Créé:", OUT_PATH);
  console.log("4 onglets: Patrimoine, Pépites, Plages, Randos (en-têtes uniquement).");
}

main();
