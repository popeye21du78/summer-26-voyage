/**
 * Enrichit lieux-central.xlsx : Mapbox (lat/lng), INSEE (population), categorie_taille, Wikipedia (description).
 * v4 : 3 onglets, nouveaux headers. Met à jour les cellules vides uniquement.
 *
 * Usage : npx tsx scripts/enrich-lieux-central.ts
 *         npx tsx scripts/enrich-lieux-central.ts --from=641   (reprise Patrimoine à partir de la ligne 641)
 * Prérequis : NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
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
const PROGRESS_PATH = join(CITIES_DIR, ".enrich-progress.json");

function writeProgress(data: { sheet: string; current: number; total: number }) {
  try {
    writeFileSync(PROGRESS_PATH, JSON.stringify(data), "utf-8");
  } catch {
    //
  }
}

function clearProgress() {
  try {
    if (existsSync(PROGRESS_PATH)) unlinkSync(PROGRESS_PATH);
  } catch {
    //
  }
}

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

function categorieTaille(pop: number | null): string {
  if (pop == null) return "";
  if (pop > 200_000) return "metropole";
  if (pop > 50_000) return "grande_ville";
  if (pop > 10_000) return "ville_moyenne";
  if (pop > 2_000) return "petite_ville";
  if (pop > 200) return "village";
  return "hameau";
}

/** Normalise le code département pour comparaison (2A/2B, majuscules). */
function normCodeDep(c: string): string {
  return String(c || "").trim().toUpperCase();
}

/** Vérifie et corrige code_dep/departement via geo.api.gouv.fr (INSEE). */
function checkAndCorrectDep(
  codeDepAttendu: string,
  departementAttendu: string,
  insee: { codeDepartement: string; departement: string } | null
): { code_dep: string; departement: string } | null {
  if (!insee?.codeDepartement) return null;
  const attendu = normCodeDep(codeDepAttendu);
  const reel = normCodeDep(insee.codeDepartement);
  if (attendu === reel) return null;
  return {
    code_dep: insee.codeDepartement,
    departement: insee.departement || insee.codeDepartement,
  };
}

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
  "difficulte", "denivele_positif_m", "distance_km", "duree_estimee", "lat_depart", "lng_depart",
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

/** Timeout par ligne : si une ligne dépasse ce délai (API qui bloque), on passe à la suivante. */
const ROW_TIMEOUT_MS = 45_000;

async function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error("lieux-central.xlsx introuvable.");
    process.exit(1);
  }

  const cache = loadCache();
  let cacheUpdated = false;

  const fromArg = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1];
  const fromPatrimoine = fromArg ? Math.max(0, parseInt(fromArg, 10)) : 0;
  if (fromPatrimoine > 0) {
    console.log(`>> Reprise Patrimoine à partir de la ligne ${fromPatrimoine}\n`);
  }

  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  const saveWorkbook = () => {
    try {
      mkdirSync(CITIES_DIR, { recursive: true });
      XLSX.writeFile(wb, XLSX_PATH);
    } catch {}
  };

  const sheetsToProcess: { name: string; type: "patrimoine" | "plages" | "randos"; headers: string[] }[] = [
    { name: "Patrimoine", type: "patrimoine", headers: PATRIMOINE_HEADERS },
    { name: "Plages", type: "plages", headers: PLAGES_HEADERS },
    { name: "Randos", type: "randos", headers: RANDOS_HEADERS },
  ];

  for (const { name: sheetName, type, headers } of sheetsToProcess) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const outRows: (string | number)[][] = [headers];
    let depCorriges = 0;

    const skipUntil = sheetName === "Patrimoine" && fromPatrimoine > 0 ? fromPatrimoine : 0;
    if (skipUntil > 0) {
      for (let j = 0; j < skipUntil && j < rows.length; j++) {
        outRows.push(rowToArray(rows[j], headers, {}));
      }
      console.log(`   ${sheetName}: ${skipUntil} lignes conservées (reprise)`);
    }

    writeProgress({ sheet: sheetName, current: skipUntil, total: rows.length });

    for (let i = skipUntil; i < rows.length; i++) {
      if (i % 10 === 0 || i === rows.length - 1) {
        writeProgress({ sheet: sheetName, current: i + 1, total: rows.length });
      }
      const row = rows[i];
      const processRow = async (): Promise<(string | number)[]> => {
        const nom = cell(row.nom);
        if (!nom) return rowToArray(row, headers, {});

        const codeDep = cell(row.code_dep);
        const departement = cell(row.departement);
        const nomGeocodage = cell(row.nom_geocodage);
        const commune = cell(row.commune);
        const communeDepart = cell(row.commune_depart);

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
            type === "randos" && communeDepart ? communeDepart :
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

        if (lat != null && lng != null) {
          const insee = await getCommuneByCoord(lat, lng);
          await delay(150);

          if (insee) {
            if (type === "patrimoine") {
              const pop = toNum(row.population);
              if (pop == null && insee.population != null) {
                updates["population"] = insee.population;
                updates["categorie_taille"] = categorieTaille(insee.population);
              } else if (pop != null && !cell(row.categorie_taille)) {
                updates["categorie_taille"] = categorieTaille(pop);
              }
            }

            const correction = checkAndCorrectDep(codeDep, departement, insee);
            if (correction) {
              updates["code_dep"] = correction.code_dep;
              updates["departement"] = correction.departement;
              depCorriges++;
              console.warn(
                `   ⚠ ${sheetName} "${nom}": attendu ${codeDep} (${departement}), INSEE → ${correction.code_dep} (${correction.departement}), corrigé`
              );
            }
          }

          if (type === "patrimoine") {
            const desc = cell(row.description_courte);
            if (!desc) {
              const depPourWiki = String(updates["departement"] ?? departement ?? "").trim();
              const wiki = await getWikipediaExtract(nom, depPourWiki ? { departement: depPourWiki } : undefined);
              await delay(300);
              if (wiki) updates["description_courte"] = cell(wiki);
            }
          }
        }

        return rowToArray(row, headers, updates);
      };

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Blocage 45s — ligne ignorée`)), ROW_TIMEOUT_MS)
      );

      try {
        const result = await Promise.race([processRow(), timeout]);
        outRows.push(result);
      } catch (err) {
        console.warn(`   ⚠ ${sheetName} ligne ${i + 1} (${cell(row?.nom) || "?"}):`, (err as Error).message);
        outRows.push(rowToArray(row, headers, {}));
      }
      if ((i + 1) % 50 === 0) {
        // Garder les lignes non encore traitées pour ne pas les perdre en cas d'arrêt
        const remaining = rows.slice(i + 1).map((r) => rowToArray(r, headers, {}));
        const fullData = [...outRows, ...remaining];
        const newSheet = XLSX.utils.aoa_to_sheet(fullData);
        wb.Sheets[sheetName] = newSheet;
        saveWorkbook();
      }
    }

    const newSheet = XLSX.utils.aoa_to_sheet(outRows);
    wb.Sheets[sheetName] = newSheet;
    console.log(`  ${sheetName}: ${rows.length} lignes traitées${depCorriges > 0 ? `, ${depCorriges} départements corrigés (INSEE)` : ""}`);
  }

  if (cacheUpdated) saveCache(cache);

  mkdirSync(CITIES_DIR, { recursive: true });
  XLSX.writeFile(wb, XLSX_PATH);
  console.log("Enregistré:", XLSX_PATH);
  clearProgress();
}

main().catch((e) => {
  clearProgress();
  console.error(e);
  process.exit(1);
});
