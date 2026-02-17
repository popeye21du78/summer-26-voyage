/**
 * Lecture / écriture de data/cities/cities-maitre.csv (source de vérité).
 * Sépareur : point-virgule (Excel FR). Encodage : UTF-8 avec BOM.
 */

import path from "path";
import fs from "fs";

const CITIES_DIR = path.join(process.cwd(), "data", "cities");
const CSV_PATH = path.join(CITIES_DIR, "cities-maitre.csv");

export const CSV_COLUMNS = [
  "id",
  "nom",
  "slug",
  "departement",
  "ancienne_region",
  "lat",
  "lng",
  "population",
  "description",
  "score_beaute",
  "score_taille",
  "score_mer",
  "score_montagne",
  "score_campagne",
  "score_ville",
  "fete_village",
  "dates_fetes",
  "acces_sans_peage",
  "score_coin_paume",
  "score_metropole",
  "prix_moyen_airbnb",
  "ville_jumelle_italie",
  "plus_beaux_villages",
  "notes",
] as const;

export type CsvRow = Record<string, string>;

const BOM = "\uFEFF";
const SEP = ";";

/** Retire les retours à la ligne pour qu’une ville = une ligne dans Excel/CSV. */
function normalizeCell(value: string): string {
  return value
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeCell(value: string): string {
  const s = normalizeCell(String(value ?? "")).replace(/"/g, '""');
  if (/[;\n"]/.test(s)) return `"${s}"`;
  return s;
}

function parseCell(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

/**
 * Lit cities-maitre.csv. Retourne { headers, rows } ou null si fichier absent / illisible.
 */
export function readCitiesCsv(): { headers: string[]; rows: CsvRow[] } | null {
  try {
    if (!fs.existsSync(CSV_PATH)) return null;
    const raw = fs.readFileSync(CSV_PATH, "utf-8");
    const content = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;
    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const headers = headerLine.split(SEP).map((h) => h.trim().toLowerCase());
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(SEP).map((v) => parseCell(v.trim()));
      const row: CsvRow = {};
      headers.forEach((h, j) => {
        row[h] = (values[j] ?? "").trim();
      });
      rows.push(row);
    }

    return { headers, rows };
  } catch {
    return null;
  }
}

/**
 * Écrit les lignes dans cities-maitre.csv. Utilise l'ordre CSV_COLUMNS.
 * values[key] peut être string ou number (converti en string).
 */
export function writeCitiesCsv(rows: CsvRow[]): boolean {
  try {
    fs.mkdirSync(CITIES_DIR, { recursive: true });
    const headerLine = CSV_COLUMNS.join(SEP);
    const dataLines = rows.map((row) =>
      CSV_COLUMNS.map((col) => escapeCell(row[col] ?? "")).join(SEP)
    );
    const content = BOM + [headerLine, ...dataLines].join("\n") + "\n";
    fs.writeFileSync(CSV_PATH, content, "utf-8");
    return true;
  } catch (e) {
    console.warn("writeCitiesCsv:", e);
    return false;
  }
}

export { CSV_PATH };
