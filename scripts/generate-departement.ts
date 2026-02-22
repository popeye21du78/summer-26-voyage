/**
 * Passe 2 tout-en-un :
 * 1. PBVF en priorité (liste de référence) → GPT complète le delta patrimoine
 * 2. Randos 100% Overpass (OSM) — 0 GPT, 0 hallucination
 * 3. Lookups UNESCO/sites classés/scores manuels → écriture Excel
 * 4. Enrichissement geo (Mapbox) + INSEE + Wikipedia
 * 5. Contrôle moyenne score par tier
 *
 * v7 : Overpass pour randos, PBVF injectés, contrôle moyenne.
 * Usage : npx tsx scripts/generate-departement.ts 06
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import OpenAI from "openai";
import { getPromptPasse2 } from "./prompt-passe2";
import { TIER_EFFECTIFS } from "../data/departements/tier-effectifs";
import { getContexteDepartement, type ContexteDepartement } from "../lib/profils-departement";
import { geocodeCity } from "../lib/geocode";
import { getCommuneByCoord } from "../lib/insee-commune";
import { getWikipediaExtract } from "../lib/wikipedia-extract";
import { fetchDepartmentTrails, selectTopTrails, enrichTrailsCommune, trailToRow, type HikingTrail } from "../lib/overpass-randos";

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

function boolToStr(v: unknown): string {
  if (v === true || v === "true" || v === "oui" || v === 1) return "oui";
  return "";
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Catégorie taille à partir de la population INSEE. */
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

/** Écrit un fichier XLSX avec retry en cas de verrou OneDrive/Excel. */
async function writeXlsxWithRetry(wb: XLSX.WorkBook, path: string, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      XLSX.writeFile(wb, path);
      return;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "EBUSY" && attempt < maxRetries) {
        const waitSec = Math.min(attempt * 3, 15);
        console.log(`   Fichier verrouillé, tentative ${attempt}/${maxRetries}... (attente ${waitSec}s)`);
        await delay(waitSec * 1000);
      } else {
        throw err;
      }
    }
  }
}

const DATA_DIR = join(process.cwd(), "data");
const CITIES_DIR = join(DATA_DIR, "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const PBVF_PATH = join(DATA_DIR, "plus-beaux-villages.json");
const UNESCO_PATH = join(DATA_DIR, "unesco-france.json");
const SITES_CLASSES_PATH = join(DATA_DIR, "sites-classes-france.json");
const SCORES_METROPOLES_PATH = join(DATA_DIR, "scores-metropoles.json");
const CACHE_PATH = join(CITIES_DIR, "geocode-cache-lieux.json");

function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

type PbvfEntry = { nom: string; code_insee: string | null };

function loadPbvfSet(): Set<string> {
  try {
    if (existsSync(PBVF_PATH)) {
      let raw = readFileSync(PBVF_PATH, "utf-8");
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      const list = JSON.parse(raw) as PbvfEntry[];
      const set = new Set<string>();
      for (const v of list) set.add(normName(v.nom));
      return set;
    }
  } catch {}
  return new Set();
}

function loadScoresMetropoles(path: string): Map<string, number> {
  const map = new Map<string, number>();
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf-8");
      const data = JSON.parse(raw) as { scores: Record<string, number> };
      for (const [nom, score] of Object.entries(data.scores)) {
        map.set(normName(nom), score);
      }
    }
  } catch (err) {
    console.warn(`   ⚠ Erreur chargement scores-metropoles:`, err);
  }
  return map;
}

function loadLookupSet(path: string): Set<string> {
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf-8");
      const data = JSON.parse(raw) as { communes: Record<string, string> };
      return new Set(Object.keys(data.communes).map(normName));
    }
  } catch (err) {
    console.warn(`   ⚠ Erreur chargement lookup ${path}:`, err);
  }
  return new Set();
}

/** Extrait les PBVF d'un département depuis le fichier de référence. */
function loadPbvfForDepartment(codeDep: string): string[] {
  try {
    if (!existsSync(PBVF_PATH)) return [];
    let raw = readFileSync(PBVF_PATH, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const list = JSON.parse(raw) as PbvfEntry[];
    return list
      .filter((v) => {
        if (!v.code_insee) return false;
        const depCode = v.code_insee.startsWith("97")
          ? v.code_insee.slice(0, 3)
          : v.code_insee.slice(0, 2);
        return depCode === codeDep;
      })
      .map((v) => v.nom);
  } catch {
    return [];
  }
}

/** PBVF : score forcé entre 8 et 10 (minimum 8). */
function clampPbvfScore(raw: unknown): number {
  const n = parseInt(String(raw ?? "9"), 10);
  if (isNaN(n) || n < 8) return 9;
  if (n > 10) return 10;
  return n;
}

/** Appel GPT léger : justification 1 phrase pour chaque rando (noms réels → minimal hallucination). */
async function enrichTrailsJustification(
  openai: OpenAI,
  trails: HikingTrail[],
  nomDep: string,
): Promise<void> {
  const list = trails.map((t, i) =>
    `${i + 1}. "${t.name}" (${t.distance_km}km, D+${t.ascent}m, ${t.commune_depart || "?"})`
  ).join("\n");

  const prompt = `Pour chaque randonnée du département ${nomDep}, donne UNE phrase décrivant ce qu'on y verra (paysages, points d'intérêt, ambiance). Sois factuel et concis.

${list}

JSON : { "justifications": ["phrase1", "phrase2", ...] }`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = res.choices[0]?.message?.content;
    if (!content) return;

    if (res.usage) {
      console.log(`   Justifications tokens: ${res.usage.total_tokens} (in: ${res.usage.prompt_tokens}, out: ${res.usage.completion_tokens})`);
    }

    const parsed = JSON.parse(content) as { justifications: string[] };
    if (Array.isArray(parsed.justifications)) {
      for (let i = 0; i < trails.length && i < parsed.justifications.length; i++) {
        trails[i].justification = parsed.justifications[i] ?? "";
      }
    }
  } catch (err) {
    console.warn("   ⚠ Erreur justifications GPT:", err);
  }
}

const TIER_AVG_TARGETS: Record<string, number> = {
  S: 8.5, A: 7.5, B: 6.5, C: 5.5, D: 4.5,
};

/** Contrôle post-hoc de la moyenne des scores esthétiques. */
function checkScoreAverage(
  rows: unknown[][],
  scoreIdx: number,
  tier: string,
  nomDep: string,
) {
  const scores = rows
    .map((r) => parseInt(String(r[scoreIdx]), 10))
    .filter((n) => !isNaN(n) && n > 0);
  if (scores.length === 0) return;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const target = TIER_AVG_TARGETS[tier] ?? 6;
  const rounded = Math.round(avg * 10) / 10;
  console.log(`   Moyenne score_esthetique ${nomDep}: ${rounded} (cible tier ${tier}: ~${target})`);
  if (avg < target - 1) {
    console.warn(`   ⚠ Moyenne basse ! ${rounded} < ${target - 1} pour un tier ${tier}. Vérifier les scores.`);
  } else if (avg > target + 1.5) {
    console.warn(`   ⚠ Moyenne haute ! ${rounded} > ${target + 1.5} pour un tier ${tier}. Vérifier les scores.`);
  }
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
  "difficulte", "denivele_positif_m", "distance_km", "duree_estimee",
  "point_depart_precis", "parking_info", "url_trace", "gpx_url", "lat_depart", "lng_depart",
];

const COL_WIDTHS: Record<string, number[]> = {
  Patrimoine: [8, 22, 28, 22, 28, 24, 24, 20, 6, 6, 6, 45, 35, 10, 10, 8, 14, 6, 10],
  Plages: [8, 22, 28, 22, 32, 18, 12, 6, 8, 8, 45, 10, 10],
  Randos: [8, 22, 32, 22, 22, 45, 10, 6, 8, 8, 8, 36, 30, 45, 45, 10, 10],
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

/** Purge les lignes d'un département dans un onglet. */
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

/** Ajoute des lignes dans un onglet, en migrant les headers si nécessaire. */
function appendSheet(wb: XLSX.WorkBook, sheetName: string, headers: string[], newRows: unknown[][]) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  const existingRows = aoa.slice(1);
  const paddedRows = existingRows.map((row) => {
    const padded = [...row];
    while (padded.length < headers.length) padded.push("");
    return padded;
  });
  const combined = [headers, ...paddedRows, ...newRows];
  const newSheet = XLSX.utils.aoa_to_sheet(combined);
  const widths = COL_WIDTHS[sheetName];
  if (widths && widths.length >= headers.length) {
    newSheet["!cols"] = widths.slice(0, headers.length).map((w) => ({ wch: w }));
  } else {
    newSheet["!cols"] = headers.map(() => ({ wch: 14 }));
  }
  wb.Sheets[sheetName] = newSheet;
}

async function main() {
  const codeDep = process.argv[2] || "24";
  const tierKeys = Object.keys(TIER_EFFECTIFS) as Array<keyof typeof TIER_EFFECTIFS>;
  const nbPatrimoineByTier: Record<string, number> = {};
  const nbPepitesMinByTier: Record<string, number> = {};
  for (const k of tierKeys) {
    nbPatrimoineByTier[k] = TIER_EFFECTIFS[k].patrimoine;
    nbPepitesMinByTier[k] = TIER_EFFECTIFS[k].pepites_min;
  }

  const ctx = getContexteDepartement(codeDep, nbPatrimoineByTier, nbPepitesMinByTier);
  if (!ctx) {
    console.error("Département non trouvé (classement.json ou code invalide):", codeDep);
    process.exit(1);
  }

  const { nomDepartement: nomDep } = ctx;

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
  console.log(`\n═══ ${nomDep} (${codeDep}) — Tier ${ctx.tier} ═══\n`);
  console.log(`   Plages: ${ctx.nbPlages}, Randos: ${ctx.nbRandos} (depuis profils)`);
  if (ctx.nbPlages === 0 && ctx.nbRandos === 0) {
    console.warn("   ⚠ Plages et randos à 0. Si ce département est côtier ou a des randos, vérifier data/departements/profils-cotiers.json et profils-randos.json (code \"" + codeDep + "\"). Cwd: " + process.cwd());
  }
  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  let totalPurged = 0;
  for (const sn of ["Patrimoine", "Plages", "Randos"]) {
    totalPurged += purgeSheet(wb, sn, codeDep);
  }
  if (totalPurged > 0) {
    console.log(`   Purgé ${totalPurged} anciennes lignes du ${codeDep}`);
  }

  // ──────────────── ÉTAPE 2 : PBVF + GÉNÉRATION OPENAI ────────────────
  const pbvfDep = loadPbvfForDepartment(codeDep);
  if (pbvfDep.length > 0) {
    console.log(`   PBVF du département: ${pbvfDep.length} (${pbvfDep.join(", ")})`);
  }

  const nbGptComplement = Math.max(0, ctx.nbPatrimoine - pbvfDep.length);
  const prompt = getPromptPasse2(ctx, pbvfDep, nbGptComplement);
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
    patrimoine_pbvf?: Array<Record<string, unknown>>;
    plages?: Array<Record<string, unknown>>;
  };

  if (res.usage) {
    console.log(`   Tokens: ${res.usage.total_tokens} (in: ${res.usage.prompt_tokens}, out: ${res.usage.completion_tokens})`);
  }

  const gptPatrimoine = data.patrimoine ?? [];
  const gptPbvfScores = data.patrimoine_pbvf ?? [];

  const pbvfEntries: Array<Record<string, unknown>> = pbvfDep.map((nom) => {
    const gptData = gptPbvfScores.find(
      (p) => normName(cell(p.nom)) === normName(nom),
    );
    return {
      nom,
      nom_geocodage: null,
      type_precis: "Plus Beaux Villages de France",
      tags_architecture: gptData?.tags_architecture ?? [],
      tags_cadre: gptData?.tags_cadre ?? [],
      score_esthetique: clampPbvfScore(gptData?.score_esthetique),
      score_notoriete: gptData?.score_notoriete ?? 5,
      plus_beaux_villages: true,
      description_courte: gptData?.description_courte ?? "",
      activites_notables: gptData?.activites_notables ?? [],
    };
  });

  const allPatrimoine = [...pbvfEntries, ...gptPatrimoine];
  console.log(`   Patrimoine: ${pbvfEntries.length} PBVF + ${gptPatrimoine.length} GPT = ${allPatrimoine.length}`);

  // ──────────────── ÉTAPE 2b : RANDOS 100% OVERPASS ────────────────
  let selectedTrails: HikingTrail[] = [];
  let randoRows: Record<string, unknown>[] = [];
  if (ctx.nbRandos > 0) {
    const allTrails = await fetchDepartmentTrails(codeDep);
    selectedTrails = selectTopTrails(allTrails, ctx.nbRandos);

    console.log(">> Reverse geocode des communes de départ...");
    await enrichTrailsCommune(selectedTrails);

    for (const t of selectedTrails) {
      const dTag = t.ascent_estimated ? "~" : "";
      console.log(`   ✓ ${t.name} (${t.difficulty}, ${t.distance_km}km, D+${dTag}${t.ascent}m, ${t.commune_depart || "?"}) [score:${t.quality_score}]`);
    }

    if (selectedTrails.length > 0) {
      console.log(">> GPT: justification 1 phrase par rando (noms réels)...");
      await enrichTrailsJustification(openai, selectedTrails, nomDep);
    }

    randoRows = selectedTrails.map((t) => trailToRow(t, codeDep, nomDep));

    if (selectedTrails.length < ctx.nbRandos) {
      console.warn(`   ⚠ Seulement ${selectedTrails.length}/${ctx.nbRandos} randos trouvées dans OSM`);
    }
  }

  // ──────────────── ÉTAPE 3 : ÉCRITURE EXCEL + LOOKUPS ────────────────
  const pbvfSet = loadPbvfSet();
  const unescoSet = loadLookupSet(UNESCO_PATH);
  const sitesClassesSet = loadLookupSet(SITES_CLASSES_PATH);
  const scoresMetropoles = loadScoresMetropoles(SCORES_METROPOLES_PATH);
  let unescoCount = 0;
  let scCount = 0;
  let scoreOverrideCount = 0;
  let hcCount = 0;

  const isPbvf = (nom: string) => pbvfSet.has(normName(nom));
  const isUnesco = (nom: string) => unescoSet.has(normName(nom));
  const isSiteClasse = (nom: string) => sitesClassesSet.has(normName(nom));

  /** Applique le score final : lookup manuel > PBVF clamp (8-10) > score GPT. */
  function finalScore(gptScore: unknown, nom: string, isAlreadyPbvf: boolean): string {
    const key = normName(nom);
    const manualScore = scoresMetropoles.get(key);
    if (manualScore !== undefined) {
      scoreOverrideCount++;
      if (manualScore < 0) {
        hcCount++;
        console.warn(`   ⚠ HC détecté : "${nom}" (hors classement) — score forcé à 0`);
        return "0";
      }
      return String(manualScore);
    }
    if (isAlreadyPbvf) return String(clampPbvfScore(gptScore));
    const s = parseInt(cell(gptScore), 10);
    if (isPbvf(nom) && (isNaN(s) || s < 8)) return "9";
    return cell(gptScore);
  }

  const patrimoineRows = allPatrimoine.map((p) => {
    const nom = cell(p.nom);
    const pbvf = isPbvf(nom) || p.plus_beaux_villages === true;
    const unesco = isUnesco(nom);
    if (unesco) unescoCount++;
    const sc = isSiteClasse(nom);
    if (sc) scCount++;
    return [
      codeDep, nomDep, nom, slugFromNom(nom), cell(p.nom_geocodage), cell(p.type_precis),
      arrToStr(p.tags_architecture), arrToStr(p.tags_cadre),
      finalScore(p.score_esthetique, nom, p.plus_beaux_villages === true),
      cell(p.score_notoriete),
      pbvf ? "oui" : "",
      cell(p.description_courte), arrToStr(p.activites_notables),
      "", "", "", "", unesco ? "oui" : "", sc ? "oui" : "",
    ];
  });

  const plagesRows = (data.plages ?? []).map((p) => [
    codeDep, nomDep, cell(p.nom), slugFromNom(cell(p.nom)), cell(p.nom_geocodage), cell(p.commune),
    cell(p.type_plage), boolToStr(p.surf), boolToStr(p.naturiste), boolToStr(p.familiale),
    cell(p.justification), "", "",
  ]);

  const randosExcelRows = randoRows.map((r) => {
    const nom = cell(r.nom);
    return [
      codeDep, nomDep, nom, slugFromNom(nom || "rando"),
      cell(r.commune_depart), cell(r.justification), cell(r.niveau_souhaite),
      cell(r.difficulte), cell(r.denivele_positif_m), cell(r.distance_km), cell(r.duree_estimee),
      cell(r.point_depart_precis), cell(r.parking_info), cell(r.url_trace), cell(r.gpx_url),
      r.lat_depart ?? "", r.lng_depart ?? "",
    ];
  });

  appendSheet(wb, "Patrimoine", PATRIMOINE_HEADERS, patrimoineRows);
  appendSheet(wb, "Plages", PLAGES_HEADERS, plagesRows);
  appendSheet(wb, "Randos", RANDOS_HEADERS, randosExcelRows);

  mkdirSync(CITIES_DIR, { recursive: true });
  await writeXlsxWithRetry(wb, XLSX_PATH);

  console.log(`\n>> Excel mis à jour`);
  console.log(`   Patrimoine: ${patrimoineRows.length} (dont ${pbvfDep.length} PBVF), Plages: ${plagesRows.length}, Randos: ${randosExcelRows.length}`);
  if (unescoCount > 0) console.log(`   UNESCO détectés : ${unescoCount}`);
  if (scCount > 0) console.log(`   Sites classés détectés : ${scCount}`);
  if (scoreOverrideCount > 0) console.log(`   Scores manuels appliqués : ${scoreOverrideCount}${hcCount > 0 ? ` (dont ${hcCount} HC)` : ""}`);

  const scoreIdx = PATRIMOINE_HEADERS.indexOf("score_esthetique");
  checkScoreAverage(patrimoineRows, scoreIdx, ctx.tier, nomDep);

  // ──────────────── ÉTAPE 4 : ENRICHISSEMENT ────────────────
  console.log("\n>> Enrichissement Mapbox + INSEE + Wikipedia...");

  const cache = loadCache();
  let cacheUpdated = false;

  const wb2buf = readFileSync(XLSX_PATH);
  const wb2 = XLSX.read(wb2buf, { type: "buffer" });

  const sheetsToProcess: { name: string; type: "patrimoine" | "plages" | "randos"; headers: string[] }[] = [
    { name: "Patrimoine", type: "patrimoine", headers: PATRIMOINE_HEADERS },
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
    let depCorriges = 0;

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
      const communeDepart = cell(row.commune_depart);

      let lat = toNum(row.lat);
      let lng = toNum(row.lng);
      if (type === "randos" && (lat == null || lng == null)) {
        lat = toNum(row.lat_depart) ?? null;
        lng = toNum(row.lng_depart) ?? null;
      }

      const updates: Partial<Record<string, string | number>> = {};

      if (lat == null || lng == null) {
        const pointDepartPrecis = cell(row.point_depart_precis);
        const query =
          nomGeocodage ? nomGeocodage :
          type === "plages" && commune ? `${nom}, ${commune}` :
          type === "randos" && pointDepartPrecis ? pointDepartPrecis :
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

        // Ne jamais remplacer les coords d'une plage par le centre de la commune :
        // la plage est sur la côte, le centre commune est souvent dans les terres.

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

          const correction = checkAndCorrectDep(rowCodeDep, departement, insee);
          if (correction) {
            updates["code_dep"] = correction.code_dep;
            updates["departement"] = correction.departement;
            depCorriges++;
            console.warn(
              `   ⚠ ${sheetName} "${nom}": attendu ${rowCodeDep} (${departement}), INSEE → ${correction.code_dep} (${correction.departement}), corrigé`
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

      outRows.push(rowToArray(row, headers, updates));
    }

    const newSheet = XLSX.utils.aoa_to_sheet(outRows);
    const widths = COL_WIDTHS[sheetName];
    if (widths && widths.length >= headers.length) {
      newSheet["!cols"] = widths.slice(0, headers.length).map((w) => ({ wch: w }));
    }
    wb2.Sheets[sheetName] = newSheet;
    console.log(`   ${sheetName}: ${enriched} géocodés${depCorriges > 0 ? `, ${depCorriges} départements corrigés (INSEE)` : ""}`);
  }

  if (cacheUpdated) saveCache(cache);

  await writeXlsxWithRetry(wb2, XLSX_PATH);
  console.log(`\n>> Terminé ! Fichier : ${XLSX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
