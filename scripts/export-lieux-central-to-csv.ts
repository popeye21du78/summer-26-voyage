/**
 * Exporte lieux-central.xlsx vers CSV et JSON.
 * Génère : patrimoine.csv, plages.csv, randos.csv, lieux-central.csv (unifié), lieux-central.json.
 *
 * Usage : npx tsx scripts/export-lieux-central-to-csv.ts
 *         npx tsx scripts/export-lieux-central-to-csv.ts --unified   (CSV unifié + JSON uniquement)
 *         npx tsx scripts/export-lieux-central-to-csv.ts --sheets    (uniquement les 3 CSV par onglet)
 *         npx tsx scripts/export-lieux-central-to-csv.ts --json      (uniquement lieux-central.json)
 *
 * Prérequis : data/cities/lieux-central.xlsx existe
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const CITIES_DIR = join(process.cwd(), "data", "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const BOM = "\uFEFF";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value)
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => escapeCsvCell(row[h]));
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error("❌ lieux-central.xlsx introuvable. Lance d'abord le Process ou l'enrichissement.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const onlyUnified = args.includes("--unified");
  const onlySheets = args.includes("--sheets");
  const onlyJson = args.includes("--json");

  mkdirSync(CITIES_DIR, { recursive: true });

  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  const PATRIMOINE_HEADERS = [
    "code_dep", "departement", "nom", "slug", "nom_geocodage", "type_precis", "tags_architecture", "tags_cadre",
    "score_esthetique", "score_notoriete", "plus_beaux_villages", "description_courte", "activites_notables",
    "lat", "lng", "population", "categorie_taille", "unesco", "site_classe",
  ];

  const PLAGES_HEADERS = [
    "code_dep", "departement", "nom", "slug", "nom_geocodage", "commune", "type_plage", "surf", "naturiste", "familiale",
    "justification", "lat", "lng",
  ];

  const RANDOS_HEADERS = [
    "code_dep", "departement", "nom", "slug", "commune_depart", "justification", "niveau_souhaite",
    "difficulte", "denivele_positif_m", "distance_km", "duree_estimee",
    "point_depart_precis", "parking_info", "url_trace", "gpx_url", "lat_depart", "lng_depart",
  ];

  let exported = 0;

  if (!onlyUnified && !onlyJson) {
    const patrimoine = XLSX.utils.sheet_to_json(wb.Sheets["Patrimoine"] ?? {}, { defval: "" }) as Record<string, unknown>[];
    const plages = XLSX.utils.sheet_to_json(wb.Sheets["Plages"] ?? {}, { defval: "" }) as Record<string, unknown>[];
    const randos = XLSX.utils.sheet_to_json(wb.Sheets["Randos"] ?? {}, { defval: "" }) as Record<string, unknown>[];

    const pPath = join(CITIES_DIR, "patrimoine.csv");
    const plPath = join(CITIES_DIR, "plages.csv");
    const rPath = join(CITIES_DIR, "randos.csv");

    writeFileSync(pPath, BOM + rowsToCsv(PATRIMOINE_HEADERS, patrimoine), "utf-8");
    writeFileSync(plPath, BOM + rowsToCsv(PLAGES_HEADERS, plages), "utf-8");
    writeFileSync(rPath, BOM + rowsToCsv(RANDOS_HEADERS, randos), "utf-8");

    console.log(`  patrimoine.csv  (${patrimoine.length} lignes)`);
    console.log(`  plages.csv     (${plages.length} lignes)`);
    console.log(`  randos.csv     (${randos.length} lignes)`);
    exported += 3;
  }

  if (!onlySheets || onlyJson) {
    const patrimoine = XLSX.utils.sheet_to_json(wb.Sheets["Patrimoine"] ?? {}, { defval: "" }) as Record<string, unknown>[];
    const plages = XLSX.utils.sheet_to_json(wb.Sheets["Plages"] ?? {}, { defval: "" }) as Record<string, unknown>[];
    const randos = XLSX.utils.sheet_to_json(wb.Sheets["Randos"] ?? {}, { defval: "" }) as Record<string, unknown>[];

    const UNIFIED_HEADERS = [
      "source_type", "code_dep", "departement", "nom", "slug", "type_precis", "tags_architecture", "tags_cadre",
      "plus_beaux_villages", "score_esthetique", "score_notoriete", "description_courte", "activites_notables",
      "lat", "lng", "population", "categorie_taille",
      "commune", "type_plage", "surf", "naturiste", "familiale", "justification",
      "commune_depart", "niveau_souhaite", "difficulte", "denivele_positif_m", "distance_km", "duree_estimee",
    ];

    const toNum = (v: unknown): number | null => {
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      if (typeof v === "string") {
        const n = parseFloat(String(v).replace(",", "."));
        return Number.isNaN(n) ? null : n;
      }
      return null;
    };
    const toStr = (v: unknown) => (v == null ? "" : String(v).trim());

    const unifiedRows: Record<string, unknown>[] = [];

    for (const r of patrimoine) {
      unifiedRows.push({
        source_type: "patrimoine",
        code_dep: toStr(r.code_dep),
        departement: toStr(r.departement),
        nom: toStr(r.nom),
        slug: toStr(r.slug),
        type_precis: toStr(r.type_precis),
        tags_architecture: toStr(r.tags_architecture),
        tags_cadre: toStr(r.tags_cadre),
        plus_beaux_villages: toStr(r.plus_beaux_villages),
        score_esthetique: toStr(r.score_esthetique),
        score_notoriete: toStr(r.score_notoriete),
        description_courte: toStr(r.description_courte),
        activites_notables: toStr(r.activites_notables),
        lat: toNum(r.lat) ?? "",
        lng: toNum(r.lng) ?? "",
        population: toNum(r.population) ?? "",
        categorie_taille: toStr(r.categorie_taille),
        commune: "",
        type_plage: "",
        surf: "",
        naturiste: "",
        familiale: "",
        justification: "",
        commune_depart: "",
        niveau_souhaite: "",
        difficulte: "",
        denivele_positif_m: "",
        distance_km: "",
        duree_estimee: "",
      });
    }

    for (const r of plages) {
      unifiedRows.push({
        source_type: "plage",
        code_dep: toStr(r.code_dep),
        departement: toStr(r.departement),
        nom: toStr(r.nom),
        slug: toStr(r.slug),
        type_precis: "",
        tags_architecture: "",
        tags_cadre: "",
        plus_beaux_villages: "",
        score_esthetique: "",
        score_notoriete: "",
        description_courte: "",
        activites_notables: "",
        lat: toNum(r.lat) ?? "",
        lng: toNum(r.lng) ?? "",
        population: "",
        categorie_taille: "",
        commune: toStr(r.commune),
        type_plage: toStr(r.type_plage),
        surf: toStr(r.surf),
        naturiste: toStr(r.naturiste),
        familiale: toStr(r.familiale),
        justification: toStr(r.justification),
        commune_depart: "",
        niveau_souhaite: "",
        difficulte: "",
        denivele_positif_m: "",
        distance_km: "",
        duree_estimee: "",
      });
    }

    for (const r of randos) {
      const lat = toNum(r.lat_depart) ?? toNum(r.lat) ?? "";
      const lng = toNum(r.lng_depart) ?? toNum(r.lng) ?? "";
      unifiedRows.push({
        source_type: "rando",
        code_dep: toStr(r.code_dep),
        departement: toStr(r.departement),
        nom: toStr(r.nom),
        slug: toStr(r.slug),
        type_precis: "",
        tags_architecture: "",
        tags_cadre: "",
        plus_beaux_villages: "",
        score_esthetique: "",
        score_notoriete: "",
        description_courte: "",
        activites_notables: "",
        lat,
        lng,
        population: "",
        categorie_taille: "",
        commune: "",
        type_plage: "",
        surf: "",
        naturiste: "",
        familiale: "",
        justification: toStr(r.justification),
        commune_depart: toStr(r.commune_depart),
        niveau_souhaite: toStr(r.niveau_souhaite),
        difficulte: toStr(r.difficulte),
        denivele_positif_m: toStr(r.denivele_positif_m),
        distance_km: toStr(r.distance_km),
        duree_estimee: toStr(r.duree_estimee),
      });
    }

    if (!onlyJson) {
      const unifiedPath = join(CITIES_DIR, "lieux-central.csv");
      writeFileSync(unifiedPath, BOM + rowsToCsv(UNIFIED_HEADERS, unifiedRows), "utf-8");
      console.log(`  lieux-central.csv (${unifiedRows.length} lignes unifiées)`);
      exported++;
    }

    const jsonPath = join(CITIES_DIR, "lieux-central.json");
    writeFileSync(jsonPath, JSON.stringify({ lieux: unifiedRows }, null, 2), "utf-8");
    console.log(`  lieux-central.json (${unifiedRows.length} lieux)`);
    exported++;
  }

  console.log(`\n✓ ${exported} fichier(s) généré(s) dans data/cities/`);
}

main();
