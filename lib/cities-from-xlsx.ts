import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { citiesExample } from "../data/cities/cities-example";
import type { CityPoint } from "../data/cities/cities-example";
import {
  readCitiesCsv,
  writeCitiesCsv,
  CSV_COLUMNS,
  type CsvRow,
} from "./cities-csv";
import { geocodeCity } from "./geocode";
import { getCommuneByCoord } from "./insee-commune";
import { getWikipediaExtract } from "./wikipedia-extract";

const CITIES_DIR = path.join(process.cwd(), "data", "cities");
const XLSX_PATH = path.join(CITIES_DIR, "data-villes.xlsx");
const CACHE_PATH = path.join(CITIES_DIR, "geocode-cache.json");

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const s = String(v).trim();
    if (!s) return null;
    const n = parseFloat(s.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function toString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function slugFromNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export type EnrichmentCacheEntry = {
  lat: number;
  lng: number;
  departement?: string;
  population?: number;
  description?: string;
};

type GeocodeCache = Record<string, EnrichmentCacheEntry>;

function loadGeocodeCache(): GeocodeCache {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, "utf-8");
      const data = JSON.parse(raw) as GeocodeCache;
      return typeof data === "object" && data !== null ? data : {};
    }
  } catch {
    // ignore
  }
  return {};
}

function saveGeocodeCache(cache: GeocodeCache): void {
  try {
    fs.mkdirSync(CITIES_DIR, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.warn("geocode cache save:", e);
  }
}

async function enrichFromApis(
  entry: EnrichmentCacheEntry,
  nom: string,
  depFromRow: string
): Promise<EnrichmentCacheEntry> {
  let { lat, lng, departement, population, description } = entry;
  let updated = false;

  if ((!departement || population == null) && lat != null && lng != null) {
    const insee = await getCommuneByCoord(lat, lng);
    if (insee) {
      if (!departement) {
        departement = insee.departement;
        updated = true;
      }
      if (population == null && insee.population != null) {
        population = insee.population;
        updated = true;
      }
    }
  }

  if (!description) {
    const dep = departement ?? depFromRow;
    const ext = await getWikipediaExtract(
      nom,
      dep ? { departement: dep } : undefined
    );
    if (ext) {
      description = ext;
      updated = true;
    }
  }

  if (!updated) return entry;
  return { lat, lng, departement, population, description };
}

/** Convertit des lignes xlsx (array de array + headers) en CsvRow[] avec colonnes normalisées. */
function xlsxRowsToCsvRows(
  headers: string[],
  rows: unknown[][]
): CsvRow[] {
  const csvRows: CsvRow[] = [];
  const colIndex: Record<string, number> = {};
  CSV_COLUMNS.forEach((col) => {
    const i = headers.findIndex((h) => h.toLowerCase() === col);
    if (i >= 0) colIndex[col] = i;
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const csvRow: CsvRow = {};
    CSV_COLUMNS.forEach((col) => {
      const idx = colIndex[col];
      const raw = idx >= 0 ? row[idx] : undefined;
      if (raw != null && raw !== "") {
        csvRow[col] = String(raw).trim();
      } else {
        csvRow[col] = "";
      }
    });
    csvRows.push(csvRow);
  }
  return csvRows;
}

/**
 * Charge les villes depuis data-villes.xlsx. Lit le premier onglet.
 */
function loadFromXlsx(): CsvRow[] | null {
  try {
    if (!fs.existsSync(XLSX_PATH)) return null;
    const buffer = fs.readFileSync(XLSX_PATH);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return null;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];
    if (rows.length < 2) return null;
    const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
    const nomIdx = headers.findIndex((h) => h.toLowerCase() === "nom");
    if (nomIdx === -1) return null;
    return xlsxRowsToCsvRows(
      headers,
      rows.slice(1).filter((r) => String((r as unknown[])[nomIdx] ?? "").trim())
    );
  } catch {
    return null;
  }
}

/** Une cellule = une ligne dans l’Excel : on enlève les retours à la ligne pour éviter les fausses lignes. */
function cellForExcel(value: string): string {
  return value
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Réécrit data-villes.xlsx avec toutes les lignes (dont population, description enrichies).
 * Les descriptions multi-lignes sont mises sur une seule ligne pour ne pas ajouter de lignes au tableau.
 */
function writeBackToXlsx(rows: CsvRow[]): boolean {
  try {
    const aoa: string[][] = [
      [...CSV_COLUMNS],
      ...rows.map((row) =>
        CSV_COLUMNS.map((col) =>
          cellForExcel(String(row[col] ?? ""))
        )
      ),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Villes");
    fs.mkdirSync(CITIES_DIR, { recursive: true });
    XLSX.writeFile(workbook, XLSX_PATH);
    return true;
  } catch (e) {
    console.warn("writeBackToXlsx:", e);
    return false;
  }
}

/** Une seule ligne par ville (même id/slug ou nom+departement) pour éviter doublons dans l’Excel et sur la carte. */
function uniqueRows(rows: CsvRow[]): CsvRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = toString(row.id).trim();
    const slug = toString(row.slug).trim();
    const nom = toString(row.nom).trim();
    const dep = toString(row.departement).trim();
    const key = id || slug || `${nom.toLowerCase()}|${dep.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Lit data-villes.xlsx en priorité, sinon cities-maitre.csv.
 * Enrichit (lat, lng, departement, population, description) via Mapbox, geo.api.gouv.fr, Wikipedia.
 * Réécrit data-villes.xlsx (et cities-maitre.csv) pour que tu voies tout dans l’Excel.
 * Les doublons (même ville en plusieurs lignes) sont supprimés automatiquement.
 */
export async function getCitiesFromXlsx(): Promise<CityPoint[]> {
  try {
    let rows: CsvRow[] = [];
    let fromXlsx = false;

    const xlsxRows = loadFromXlsx();
    if (xlsxRows && xlsxRows.length > 0) {
      rows = uniqueRows(xlsxRows);
      fromXlsx = true;
    } else {
      const parsed = readCitiesCsv();
      if (parsed && parsed.rows.length > 0) {
        rows = uniqueRows(parsed.rows);
      } else {
        // Aucune donnée : créer data-villes.xlsx avec les en-têtes pour que l’utilisateur puisse ajouter des villes
        writeBackToXlsx([]);
        return citiesExample;
      }
    }

    const geocodeCache = loadGeocodeCache();
    let cacheUpdated = false;
    const cities: CityPoint[] = [];

    for (const row of rows) {
      const nom = toString(row.nom).trim();
      if (!nom) continue;

      const depFromRow = toString(row.departement);
      const cacheKey = `${nom}|${depFromRow}`;

      let lat = toNum(row.lat);
      let lng = toNum(row.lng);
      let departement = toString(row.departement);
      let population = row.population != null ? toString(row.population) : "";
      let description = toString(row.description);

      let entry = geocodeCache[cacheKey];

      if (lat == null || lng == null) {
        if (entry?.lat != null && entry?.lng != null) {
          lat = entry.lat;
          lng = entry.lng;
          if (entry.departement && !departement) departement = entry.departement;
          if (entry.population != null && !population)
            population = String(entry.population);
          if (entry.description && !description) description = entry.description;
        } else {
          const geo = await geocodeCity(
            nom,
            depFromRow ? { departement: depFromRow } : undefined
          );
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            entry = { lat: geo.lat, lng: geo.lng };
            geocodeCache[cacheKey] = entry;
            cacheUpdated = true;
          }
        }
      } else if (entry) {
        if (entry.departement && !departement) departement = entry.departement;
        if (entry.population != null && !population)
          population = String(entry.population);
        if (entry.description && !description) description = entry.description;
      } else {
        entry = { lat, lng };
        geocodeCache[cacheKey] = entry;
        cacheUpdated = true;
      }

      if (lat == null || lng == null) continue;

      if (!geocodeCache[cacheKey]) {
        geocodeCache[cacheKey] = { lat, lng };
        cacheUpdated = true;
      }
      entry = geocodeCache[cacheKey];
      const enriched = await enrichFromApis(entry, nom, departement);
      if (enriched.departement && !departement)
        departement = enriched.departement;
      if (enriched.population != null && !population)
        population = String(enriched.population);
      if (enriched.description && !description)
        description = enriched.description;

      if (
        enriched.departement ||
        enriched.population != null ||
        enriched.description
      ) {
        geocodeCache[cacheKey] = enriched;
        cacheUpdated = true;
      }

      row.lat = String(lat);
      row.lng = String(lng);
      row.departement = departement;
      row.population = population;
      row.description = description;
      if (!row.id) row.id = slugFromNom(nom);
      if (!row.slug) row.slug = row.id;

      const plusBeaux = toString(row.plus_beaux_villages).toLowerCase();
      const plus_beaux_villages: "oui" | "non" =
        plusBeaux === "oui" ? "oui" : "non";

      cities.push({
        id: row.id,
        nom,
        slug: row.slug,
        departement,
        ancienne_region: toString(row.ancienne_region),
        lat,
        lng,
        plus_beaux_villages,
        notes: toString(row.notes),
      });
    }

    if (cacheUpdated) saveGeocodeCache(geocodeCache);

    if (fromXlsx) {
      writeBackToXlsx(rows);
    }
    writeCitiesCsv(rows);

    return cities.length > 0 ? cities : citiesExample;
  } catch (e) {
    console.error("getCitiesFromXlsx:", e);
    return citiesExample;
  }
}
