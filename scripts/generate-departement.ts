/**
 * Passe 2 tout-en-un : purge du département → génération OpenAI → écriture Excel → enrichissement Mapbox/INSEE/Wikipedia.
 * Usage : npx tsx scripts/generate-departement.ts 13
 * Relancer la même commande écrase les anciennes données du département.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import OpenAI from "openai";
import { getPromptPasse2 } from "./prompt-passe2";
import { TIER_EFFECTIFS } from "../data/departements/tier-effectifs";
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

function slugFromNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arrToStr(arr: unknown): string {
  if (Array.isArray(arr)) return arr.map((x) => cell(x)).join(", ");
  return cell(arr);
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

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Écrit un fichier XLSX avec retry en cas de verrou OneDrive/Excel. */
async function writeXlsxWithRetry(wb: XLSX.WorkBook, path: string, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      XLSX.writeFile(wb, path);
      return;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "EBUSY" && attempt < maxRetries) {
        console.log(`   Fichier verrouillé, tentative ${attempt}/${maxRetries}... (attente ${attempt * 2}s)`);
        await delay(attempt * 2000);
      } else {
        throw err;
      }
    }
  }
}

const CITIES_DIR = join(process.cwd(), "data", "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const CLASSEMENT_PATH = join(process.cwd(), "data", "departements", "classement.json");
const CACHE_PATH = join(CITIES_DIR, "geocode-cache-lieux.json");
const PBVF_PATH = join(process.cwd(), "data", "plus-beaux-villages.json");

type PbvfEntry = { nom: string; code_insee: string | null };

function loadPbvfSet(): Set<string> {
  try {
    if (existsSync(PBVF_PATH)) {
      const raw = readFileSync(PBVF_PATH, "utf-8");
      const list = JSON.parse(raw) as PbvfEntry[];
      const set = new Set<string>();
      for (const v of list) {
        set.add(v.nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      }
      return set;
    }
  } catch {}
  return new Set();
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

const COL_WIDTHS: Record<string, number[]> = {
  Patrimoine: [8, 22, 28, 22, 28, 24, 20, 6, 6, 6, 5, 6, 6, 45, 18, 35, 10, 10, 8, 6],
  "Pépites": [8, 22, 28, 22, 28, 24, 20, 6, 6, 6, 5, 6, 6, 45, 18, 35, 10, 10, 8, 6],
  Plages: [8, 22, 28, 22, 35, 18, 22, 12, 20, 6, 6, 6, 45, 10, 10],
  Randos: [8, 22, 28, 22, 22, 10, 8, 8, 8, 20, 6, 6, 45, 10, 10],
};

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

type Tier = keyof typeof TIER_EFFECTIFS;

/** Purge les lignes d'un département dans un onglet, retourne les lignes restantes (header inclus). */
function purgeSheet(wb: XLSX.WorkBook, sheetName: string, codeDep: string): number {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return 0;
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  const header = aoa[0] as string[];
  const codeIdx = header.indexOf("code_dep");
  if (codeIdx < 0) return 0;
  const before = aoa.length - 1;
  const kept = aoa.slice(1).filter((row) => String(row[codeIdx]).trim() !== codeDep);
  const removed = before - kept.length;
  const newSheet = XLSX.utils.aoa_to_sheet([header, ...kept]);
  const widths = COL_WIDTHS[sheetName];
  if (widths && widths.length >= header.length) {
    newSheet["!cols"] = widths.slice(0, header.length).map((w) => ({ wch: w }));
  }
  wb.Sheets[sheetName] = newSheet;
  return removed;
}

/** Ajoute des lignes dans un onglet. */
function appendSheet(wb: XLSX.WorkBook, sheetName: string, headers: string[], newRows: unknown[][]) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  const header = aoa[0] as string[];
  const existingRows = aoa.slice(1);
  const combined = [header, ...existingRows, ...newRows];
  const newSheet = XLSX.utils.aoa_to_sheet(combined);
  const widths = COL_WIDTHS[sheetName];
  if (widths && widths.length >= header.length) {
    newSheet["!cols"] = widths.slice(0, header.length).map((w) => ({ wch: w }));
  } else {
    newSheet["!cols"] = header.map(() => ({ wch: 14 }));
  }
  wb.Sheets[sheetName] = newSheet;
}

async function main() {
  const codeDep = process.argv[2] || "13";
  const classementRaw = readFileSync(CLASSEMENT_PATH, "utf-8");
  const { classement } = JSON.parse(classementRaw) as { classement: Array<{ code: string; departement: string; tier: string }> };
  const entry = classement.find((e) => e.code === codeDep);
  if (!entry) {
    console.error("Département non trouvé dans classement.json:", codeDep);
    process.exit(1);
  }

  const tier = entry.tier as Tier;
  const effectifs = TIER_EFFECTIFS[tier] ?? TIER_EFFECTIFS.A;
  const nomDep = entry.departement;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY manquant dans .env.local");
    process.exit(1);
  }

  if (!existsSync(XLSX_PATH)) {
    console.error("lieux-central.xlsx introuvable. Lance d'abord: npx tsx scripts/create-lieux-central-xlsx.ts");
    process.exit(1);
  }

  // ──────────────── ÉTAPE 1 : PURGE ────────────────
  console.log(`\n═══ ${nomDep} (${codeDep}) — Tier ${tier} ═══\n`);
  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  let totalPurged = 0;
  for (const sn of ["Patrimoine", "Pépites", "Plages", "Randos"]) {
    totalPurged += purgeSheet(wb, sn, codeDep);
  }
  if (totalPurged > 0) {
    console.log(`🗑  Purgé ${totalPurged} anciennes lignes du ${codeDep}`);
  }

  // ──────────────── ÉTAPE 2 : GÉNÉRATION OPENAI ────────────────
  const prompt = getPromptPasse2({
    nomDepartement: nomDep,
    code: codeDep,
    tier,
    nbPatrimoine: effectifs.patrimoine,
    nbPepites: effectifs.pepites,
    nbPlages: effectifs.plages,
    nbRandos: effectifs.randonnees,
  });

  console.log(">> Appel GPT-4o...");
  const openai = new OpenAI({ apiKey });

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 16000,
  });

  const content = res.choices[0]?.message?.content;
  if (!content) {
    console.error("Réponse API vide");
    process.exit(1);
  }

  const data = JSON.parse(content) as {
    patrimoine?: Array<Record<string, unknown>>;
    pepites_hors_radar?: Array<Record<string, unknown>>;
    plages?: Array<Record<string, unknown>>;
    randonnees?: Array<Record<string, unknown>>;
  };

  if (res.usage) {
    console.log(`   Tokens: ${res.usage.total_tokens} (in: ${res.usage.prompt_tokens}, out: ${res.usage.completion_tokens})`);
  }

  // ──────────────── ÉTAPE 3 : ÉCRITURE EXCEL + CROISEMENT PBVF ────────────────
  const pbvfSet = loadPbvfSet();
  let pbvfCount = 0;

  function isPbvf(nom: string): boolean {
    const key = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return pbvfSet.has(key);
  }

  function pbvfScore(score: unknown, nom: string): string {
    const s = parseInt(cell(score), 10);
    if (isPbvf(nom) && (isNaN(s) || s < 9)) return "9";
    return cell(score);
  }

  const patrimoineRows = (data.patrimoine ?? []).map((p) => {
    const nom = cell(p.nom);
    const pbvf = isPbvf(nom);
    if (pbvf) pbvfCount++;
    return [
      codeDep, nomDep, nom, slugFromNom(nom), cell(p.type_precis),
      arrToStr(p.tags_architecture), arrToStr(p.tags_ambiance),
      pbvfScore(p.score_esthetique, nom), cell(p.score_pepite), cell(p.score_rando_base), cell(p.score_mer), cell(p.score_montagne), cell(p.score_campagne),
      cell(p.description_courte), cell(p.specialite_culinaire), arrToStr(p.activites_notables),
      "", "", "", pbvf ? "oui" : cell(p.plus_beaux_villages) === "true" ? "oui" : "",
    ];
  });
  const pepitesRows = (data.pepites_hors_radar ?? []).map((p) => {
    const nom = cell(p.nom);
    const pbvf = isPbvf(nom);
    if (pbvf) pbvfCount++;
    return [
      codeDep, nomDep, nom, slugFromNom(nom), cell(p.type_precis),
      arrToStr(p.tags_architecture), arrToStr(p.tags_ambiance),
      pbvfScore(p.score_esthetique, nom), cell(p.score_pepite), cell(p.score_rando_base), cell(p.score_mer), cell(p.score_montagne), cell(p.score_campagne),
      cell(p.description_courte), cell(p.specialite_culinaire), arrToStr(p.activites_notables),
      "", "", "", pbvf ? "oui" : cell(p.plus_beaux_villages) === "true" ? "oui" : "",
    ];
  });
  const plagesRows = (data.plages ?? []).map((p) => [
    codeDep, nomDep, cell(p.nom), slugFromNom(cell(p.nom)), cell(p.nom_geocodage), cell(p.commune), cell(p.proche_de_village), cell(p.type_plage), arrToStr(p.tags_ambiance),
    cell(p.score_beaute), cell(p.score_baignade), cell(p.score_surf), cell(p.description_courte), "", "",
  ]);
  const randosRows = (data.randonnees ?? []).map((r) => [
    codeDep, nomDep, cell(r.nom), slugFromNom(cell(r.nom)), cell(r.depart_village), cell(r.difficulte), cell(r.denivele_positif_m), cell(r.distance_km), cell(r.duree_estimee),
    arrToStr(r.tags_ambiance), cell(r.score_beaute_panorama), cell(r.score_esthetisme_trace), cell(r.description_courte), "", "",
  ]);

  appendSheet(wb, "Patrimoine", PATRIMOINE_HEADERS, patrimoineRows);
  appendSheet(wb, "Pépites", PATRIMOINE_HEADERS, pepitesRows);
  appendSheet(wb, "Plages", PLAGES_HEADERS, plagesRows);
  appendSheet(wb, "Randos", RANDOS_HEADERS, randosRows);

  mkdirSync(CITIES_DIR, { recursive: true });
  await writeXlsxWithRetry(wb, XLSX_PATH);

  console.log(`\n>> Excel mis à jour`);
  console.log(`   Patrimoine: ${patrimoineRows.length}, Pépites: ${pepitesRows.length}, Plages: ${plagesRows.length}, Randos: ${randosRows.length}`);
  if (pbvfCount > 0) console.log(`   PBVF détectés et corrigés : ${pbvfCount}`);

  // ──────────────── ÉTAPE 4 : ENRICHISSEMENT ────────────────
  console.log("\n>> Enrichissement Mapbox + INSEE + Wikipedia...");

  const cache = loadCache();
  let cacheUpdated = false;

  const wb2buf = readFileSync(XLSX_PATH);
  const wb2 = XLSX.read(wb2buf, { type: "buffer" });

  const sheetsToProcess: { name: string; type: "patrimoine" | "plages" | "randos"; headers: string[] }[] = [
    { name: "Patrimoine", type: "patrimoine", headers: PATRIMOINE_HEADERS },
    { name: "Pépites", type: "patrimoine", headers: PATRIMOINE_HEADERS },
    { name: "Plages", type: "plages", headers: PLAGES_HEADERS },
    { name: "Randos", type: "randos", headers: RANDOS_HEADERS },
  ];

  function rowToArray(
    row: Record<string, unknown>,
    headers: string[],
    updates: Partial<Record<string, string | number>>
  ): (string | number)[] {
    return headers.map((h) => {
      if (updates[h] !== undefined) return updates[h]!;
      const v = row[h];
      if (v == null) return "";
      return typeof v === "number" ? v : String(v).trim();
    });
  }

  for (const { name: sheetName, type, headers } of sheetsToProcess) {
    const sheet = wb2.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const outRows: (string | number)[][] = [headers];
    let enriched = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowCodeDep = cell(row.code_dep);
      const nom = cell(row.nom);

      if (!nom || rowCodeDep !== codeDep) {
        outRows.push(rowToArray(row, headers, {}));
        continue;
      }

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
          enriched++;
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
    const widths = COL_WIDTHS[sheetName];
    if (widths && widths.length >= headers.length) {
      newSheet["!cols"] = widths.slice(0, headers.length).map((w) => ({ wch: w }));
    }
    wb2.Sheets[sheetName] = newSheet;
    console.log(`   ${sheetName}: ${enriched} géocodés`);
  }

  if (cacheUpdated) saveCache(cache);

  await writeXlsxWithRetry(wb2, XLSX_PATH);
  console.log(`\n>> Terminé ! Fichier : ${XLSX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
