/**
 * Enrichit lieux-central.xlsx : Mapbox (lat/lng), INSEE (population), Wikipedia (description).
 * Met à jour les cellules vides uniquement. Utilise un cache pour limiter les appels API.
 *
 * Usage : npx tsx scripts/enrich-lieux-central.ts
 * Prérequis : OPENAI_API_KEY non requis ; NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { geocodeCity } from "../lib/geocode";
import { getCommuneByCoord } from "../lib/insee-commune";
import { getWikipediaExtract } from "../lib/wikipedia-extract";

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && value) process.env[key] = value;
      }
    }
  });
}
loadEnvLocal();

const CITIES_DIR = join(process.cwd(), "data", "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const CACHE_PATH = join(CITIES_DIR, "geocode-cache-lieux.json");

type GeocodeCache = Record<string, { lat: number; lng: number }>;

function loadCache(): GeocodeCache {
  try {
    if (existsSync(CACHE_PATH)) {
      const raw = readFileSync(CACHE_PATH, "utf-8");
      const data = JSON.parse(raw) as GeocodeCache;
      return typeof data === "object" && data !== null ? data : {};
    }
  } catch {}
  return {};
}

function saveCache(cache: GeocodeCache) {
  mkdirSync(CITIES_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function cell(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  return s.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

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

const PATRIMOINE_HEADERS = [
  "code_dep", "departement", "nom", "slug", "type_precis", "tags_architecture", "tags_ambiance",
  "score_esthetique", "score_pepite", "score_rando_base", "score_mer", "score_montagne", "score_campagne",
  "description_courte", "specialite_culinaire", "activites_notables", "lat", "lng", "population", "plus_beaux_villages",
];
const PLAGES_HEADERS = [
  "code_dep", "departement", "nom", "slug", "nom_geocodage", "commune", "proche_de_village", "type_plage", "tags_ambiance",
  "score_beaute", "score_baignade", "score_surf", "description_courte", "lat", "lng",
];
const RANDOS_HEADERS = [
  "code_dep", "departement", "nom", "slug", "depart_village", "difficulte", "denivele_positif_m", "distance_km", "duree_estimee",
  "tags_ambiance", "score_beaute_panorama", "score_esthetisme_trace", "description_courte", "lat_depart", "lng_depart",
];

function rowToArray(
  row: Record<string, unknown>,
  headers: string[],
  updates: Partial<Record<string, string | number>>
): (string | number)[] {
  return headers.map((h) => {
    if (updates[h] !== undefined) return updates[h];
    const v = row[h];
    if (v == null) return "";
    return typeof v === "number" ? v : String(v).trim();
  });
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error("lieux-central.xlsx introuvable.");
    process.exit(1);
  }

  const cache = loadCache();
  let cacheUpdated = false;

  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  const sheetsToProcess: { name: string; type: "patrimoine" | "plages" | "randos"; headers: string[] }[] = [
    { name: "Patrimoine", type: "patrimoine", headers: PATRIMOINE_HEADERS },
    { name: "Pépites", type: "patrimoine", headers: PATRIMOINE_HEADERS },
    { name: "Plages", type: "plages", headers: PLAGES_HEADERS },
    { name: "Randos", type: "randos", headers: RANDOS_HEADERS },
  ];

  for (const { name: sheetName, type, headers } of sheetsToProcess) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const outRows: (string | number)[][] = [headers];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nom = cell(row.nom);
      if (!nom) {
        outRows.push(rowToArray(row, headers, {}));
        continue;
      }

      const codeDep = cell(row.code_dep);
      const departement = cell(row.departement);
      const nomGeocodage = cell(row.nom_geocodage);
      const commune = cell(row.commune);
      const departVillage = cell(row.depart_village);

      let lat = toNum(row.lat);
      let lng = toNum(row.lng);
      if (type === "randos" && (lat == null || lng == null)) {
        lat = toNum(row.lat_depart) ?? null;
        lng = toNum(row.lng_depart) ?? null;
      }

      const updates: Partial<Record<string, string | number>> = {};

      if (lat == null || lng == null) {
        const query =
          nomGeocodage ? nomGeocodage :
          type === "plages" && commune ? `${nom}, ${commune}` :
          type === "randos" && departVillage ? departVillage :
          nom;
        const cacheKey = `${query}|${departement}`;
        if (cache[cacheKey]) {
          lat = cache[cacheKey].lat;
          lng = cache[cacheKey].lng;
        } else {
          const geo = await geocodeCity(query, departement ? { departement } : undefined);
          await delay(200);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            cache[cacheKey] = { lat, lng };
            cacheUpdated = true;
          }
        }
        if (lat != null && lng != null) {
          if (type === "randos") {
            updates["lat_depart"] = lat;
            updates["lng_depart"] = lng;
          } else {
            updates["lat"] = lat;
            updates["lng"] = lng;
          }
        }
      }

      if (type === "patrimoine" && lat != null && lng != null) {
        const pop = toNum(row.population);
        if (pop == null) {
          const insee = await getCommuneByCoord(lat, lng);
          await delay(150);
          if (insee?.population != null) {
            updates["population"] = insee.population;
          }
        }
        const desc = cell(row.description_courte);
        if (!desc) {
          const wiki = await getWikipediaExtract(nom, departement ? { departement } : undefined);
          await delay(300);
          if (wiki) updates["description_courte"] = cell(wiki);
        }
      }

      outRows.push(rowToArray(row, headers, updates));
    }

    const newSheet = XLSX.utils.aoa_to_sheet(outRows);
    wb.Sheets[sheetName] = newSheet;
    console.log(`  ${sheetName}: ${rows.length} lignes traitées`);
  }

  if (cacheUpdated) saveCache(cache);

  mkdirSync(CITIES_DIR, { recursive: true });
  XLSX.writeFile(wb, XLSX_PATH);
  console.log("Enregistré:", XLSX_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
