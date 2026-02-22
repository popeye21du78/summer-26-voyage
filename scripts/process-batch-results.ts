/**
 * Traite les résultats du batch Phase 1.
 * Parse batch_output.jsonl, fusionne PBVF, Overpass randos, justifications GPT,
 * écrit lieux-central.xlsx.
 *
 * Usage : npx tsx scripts/process-batch-results.ts
 * Options : --no-rando-justifications  (sans justifications GPT pour randos, à faire en batch plus tard)
 *           --from=17                   (reprise à partir du département 17)
 * Prérequis : data/batch/batch_output.jsonl (via download-batch-results.ts)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import OpenAI from "openai";
import { TIER_EFFECTIFS } from "../data/departements/tier-effectifs";
import { getContexteDepartement } from "../lib/profils-departement";
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

const DATA_DIR = join(process.cwd(), "data");
const BATCH_DIR = join(DATA_DIR, "batch");
const CITIES_DIR = join(DATA_DIR, "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const OUTPUT_PATH = join(BATCH_DIR, "batch_output.jsonl");
const PBVF_PATH = join(DATA_DIR, "plus-beaux-villages.json");
const PROCESS_PROGRESS_PATH = join(CITIES_DIR, ".process-progress.json");

type ProcessProgress = {
  current: number;
  total: number;
  lastDep: string;
  currentDep?: string;
  errors?: Array<{ dep: string; message: string }>;
};

function writeProcessProgress(data: ProcessProgress) {
  try {
    mkdirSync(CITIES_DIR, { recursive: true });
    writeFileSync(PROCESS_PROGRESS_PATH, JSON.stringify(data), "utf-8");
  } catch {
    //
  }
}

function clearProcessProgress() {
  try {
    if (existsSync(PROCESS_PROGRESS_PATH)) unlinkSync(PROCESS_PROGRESS_PATH);
  } catch {
    //
  }
}

type PbvfEntry = { nom: string; code_insee: string | null };

function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\r/g, " ").replace(/\s+/g, " ").trim();
}

function arrToStr(arr: unknown): string {
  if (Array.isArray(arr)) return arr.map((x) => cell(x)).join(", ");
  return cell(arr);
}

function clampPbvfScore(raw: unknown): number {
  const n = parseInt(String(raw ?? "9"), 10);
  if (isNaN(n) || n < 8) return 9;
  if (n > 10) return 10;
  return n;
}

function loadPbvfForDepartment(codeDep: string): string[] {
  try {
    if (!existsSync(PBVF_PATH)) return [];
    let raw = readFileSync(PBVF_PATH, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const list = JSON.parse(raw) as PbvfEntry[];
    return list
      .filter((v) => {
        if (!v.code_insee) return false;
        const depCode = v.code_insee.startsWith("97") ? v.code_insee.slice(0, 3) : v.code_insee.slice(0, 2);
        return depCode === codeDep;
      })
      .map((v) => v.nom);
  } catch {
    return [];
  }
}

function slugFromNom(nom: string): string {
  return nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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

async function enrichTrailsJustification(openai: OpenAI, trails: HikingTrail[], nomDep: string): Promise<void> {
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

async function main() {
  if (!existsSync(OUTPUT_PATH)) {
    console.error("❌ batch_output.jsonl introuvable. Lance download-batch-results.ts après completion du batch.");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY manquant");
    process.exit(1);
  }

  const classementPath = join(DATA_DIR, "departements", "classement.json");
  const classementData = JSON.parse(readFileSync(classementPath, "utf-8")) as {
    classement?: Array<{ code: string }>;
  };
  const allDepartements = (classementData.classement ?? []).map((e) => String(e.code));

  const fromArg = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--from") + 1];
  const fromIdx = fromArg ? Math.max(0, allDepartements.indexOf(String(fromArg).padStart(2, "0"))) : 0;
  const departements = fromIdx > 0 ? allDepartements.slice(fromIdx) : allDepartements;
  const alreadyDoneCodes = fromIdx > 0 ? new Set(allDepartements.slice(0, fromIdx)) : new Set<string>();

  const nbPatrimoineByTier: Record<string, number> = {};
  const nbPepitesMinByTier: Record<string, number> = {};
  for (const k of Object.keys(TIER_EFFECTIFS) as Array<keyof typeof TIER_EFFECTIFS>) {
    nbPatrimoineByTier[k] = TIER_EFFECTIFS[k].patrimoine;
    nbPepitesMinByTier[k] = TIER_EFFECTIFS[k].pepites_min;
  }

  const outputLines = readFileSync(OUTPUT_PATH, "utf-8").trim().split("\n").filter(Boolean);
  const byDep = new Map<string, { patrimoine: unknown[]; patrimoine_pbvf: unknown[]; plages: unknown[] }>();

  for (const line of outputLines) {
    try {
      const parsed = JSON.parse(line) as { custom_id?: string; response?: { body?: { choices?: Array<{ message?: { content?: string } }> } }; error?: unknown };
      const codeDep = parsed.custom_id;
      if (!codeDep) continue;
      if (parsed.error) {
        console.warn(`   ⚠ Erreur pour ${codeDep}:`, parsed.error);
        continue;
      }
      const content = parsed.response?.body?.choices?.[0]?.message?.content;
      if (!content) continue;
      const data = JSON.parse(content) as { patrimoine?: unknown[]; patrimoine_pbvf?: unknown[]; plages?: unknown[] };
      byDep.set(codeDep, {
        patrimoine: data.patrimoine ?? [],
        patrimoine_pbvf: data.patrimoine_pbvf ?? [],
        plages: data.plages ?? [],
      });
    } catch (e) {
      console.warn("   ⚠ Ligne invalide:", (e as Error).message);
    }
  }

  console.log(`>> ${byDep.size} départements parsés depuis le batch`);

  const skipRandoJustifications = process.argv.includes("--no-rando-justifications");
  if (skipRandoJustifications) {
    console.log(`>> --no-rando-justifications : randos sans GPT (justifications vides, à faire en batch)\n`);
  } else {
    console.log("");
  }

  if (!existsSync(XLSX_PATH)) {
    console.error("❌ lieux-central.xlsx introuvable. Lance create-lieux-central-xlsx.ts");
    process.exit(1);
  }

  const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
  const openai = new OpenAI({ apiKey });

  let allPatrimoineRows: (string | number)[][] = [];
  let allPlagesRows: (string | number)[][] = [];
  let allRandosRows: (string | number)[][] = [];

  if (fromIdx > 0 && alreadyDoneCodes.size > 0) {
    console.log(`>> Reprise à partir du département ${departements[0]} (${departements.length} restants, ${alreadyDoneCodes.size} déjà traités)\n`);
    for (const sheetName of ["Patrimoine", "Plages", "Randos"] as const) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][];
      if (rows.length < 2) continue;
      const header = rows[0];
      const codeDepIdx = (header as string[]).indexOf("code_dep");
      if (codeDepIdx < 0) continue;
      const existing = rows.slice(1).filter((r) => alreadyDoneCodes.has(String(r[codeDepIdx] ?? "").trim()));
      if (sheetName === "Patrimoine") allPatrimoineRows = existing;
      else if (sheetName === "Plages") allPlagesRows = existing;
      else allRandosRows = existing;
      console.log(`   ${sheetName}: ${existing.length} lignes conservées (dépts 01–${allDepartements[fromIdx - 1]})`);
    }
  }

  const totalDeps = allDepartements.length;
  let doneCount = fromIdx;
  let lastCompletedDep = "";
  const errors: Array<{ dep: string; message: string }> = [];

  for (const codeDep of departements) {
    const gptData = byDep.get(codeDep);
    const ctx = getContexteDepartement(codeDep, nbPatrimoineByTier, nbPepitesMinByTier);
    if (!ctx) {
      errors.push({ dep: codeDep, message: "Contexte département inconnu" });
      continue;
    }

    const nomDep = ctx.nomDepartement;

    writeProcessProgress({
      current: doneCount,
      total: totalDeps,
      lastDep: lastCompletedDep,
      currentDep: `${codeDep} ${nomDep}`,
      errors: errors.length > 0 ? errors : undefined,
    });

    const pbvfDep = loadPbvfForDepartment(codeDep);

    let patrimoineRows: (string | number)[][] = [];
    let plagesRows: (string | number)[][] = [];
    let randoRows: (string | number)[][] = [];

    try {
    if (gptData) {
      const gptPbvfScores = gptData.patrimoine_pbvf as Array<Record<string, unknown>>;
      const pbvfEntries = pbvfDep.map((nom) => {
        const gptItem = gptPbvfScores.find((p) => normName(cell(p.nom)) === normName(nom));
        return {
          nom,
          nom_geocodage: null,
          type_precis: "Plus Beaux Villages de France",
          tags_architecture: gptItem?.tags_architecture ?? [],
          tags_cadre: gptItem?.tags_cadre ?? [],
          score_esthetique: clampPbvfScore(gptItem?.score_esthetique),
          score_notoriete: gptItem?.score_notoriete ?? 5,
          plus_beaux_villages: true,
          description_courte: gptItem?.description_courte ?? "",
          activites_notables: gptItem?.activites_notables ?? [],
        };
      });
      const allPatrimoine = [...pbvfEntries, ...(gptData.patrimoine as Array<Record<string, unknown>>)];

      patrimoineRows = allPatrimoine.map((p) => [
        codeDep,
        nomDep,
        cell(p.nom),
        slugFromNom(cell(p.nom)),
        cell(p.nom_geocodage) || "",
        cell(p.type_precis) || "",
        arrToStr(p.tags_architecture),
        arrToStr(p.tags_cadre),
        cell(p.score_esthetique),
        cell(p.score_notoriete),
        p.plus_beaux_villages ? "oui" : "",
        cell(p.description_courte),
        arrToStr(p.activites_notables),
        "", "", "", "", "", "",
      ]);

      plagesRows = (gptData.plages as Array<Record<string, unknown>>).map((p) => [
        codeDep,
        nomDep,
        cell(p.nom),
        slugFromNom(cell(p.nom)),
        cell(p.nom_geocodage) || "",
        cell(p.commune) || "",
        cell(p.type_plage) || "",
        p.surf ? "oui" : "",
        p.naturiste ? "oui" : "",
        p.familiale ? "oui" : "",
        cell(p.justification) || "",
        "", "",
      ]);
    }

    if (ctx.nbRandos > 0) {
      try {
        await new Promise((r) => setTimeout(r, 2000));
        const allTrails = await fetchDepartmentTrails(codeDep);
        if (allTrails.length === 0) {
          console.log(`   ${codeDep} ${nomDep}: 0 randos (Overpass), on continue`);
          errors.push({ dep: `${codeDep} ${nomDep}`, message: "Overpass: aucun sentier (timeout ou échec)" });
        } else {
          const selectedTrails = selectTopTrails(allTrails, ctx.nbRandos);
          try {
            await enrichTrailsCommune(selectedTrails);
          } catch (e) {
            console.warn(`   ⚠ Nominatim erreur (commune_depart vide) — on continue`);
            errors.push({ dep: `${codeDep} ${nomDep}`, message: "Nominatim: communes non récupérées" });
          }
          if (selectedTrails.length > 0 && !skipRandoJustifications) {
            await enrichTrailsJustification(openai, selectedTrails, nomDep);
          }
          const randoObjRows = selectedTrails.map((t) => trailToRow(t, codeDep, nomDep));
          randoRows = randoObjRows.map((r) => [
            codeDep, nomDep, cell(r.nom), slugFromNom(cell(r.nom) || "rando"),
            cell(r.commune_depart), cell(r.justification), cell(r.niveau_souhaite),
            cell(r.difficulte), cell(r.denivele_positif_m), cell(r.distance_km), cell(r.duree_estimee),
            cell(r.point_depart_precis), cell(r.parking_info), cell(r.url_trace), cell(r.gpx_url),
            (r as { lat_depart?: number }).lat_depart ?? "", (r as { lng_depart?: number }).lng_depart ?? "",
          ]);
        }
      } catch (err) {
        const msg = (err as Error).message;
        console.warn(`   ⚠ ${codeDep} ${nomDep}: randos ignorés —`, msg);
        errors.push({ dep: `${codeDep} ${nomDep}`, message: `Randos: ${msg.slice(0, 60)}` });
      }
    }

    allPatrimoineRows.push(...patrimoineRows);
    allPlagesRows.push(...plagesRows);
    allRandosRows.push(...randoRows);

    doneCount++;
    lastCompletedDep = `${codeDep} ${nomDep}`;
    writeProcessProgress({
      current: doneCount,
      total: totalDeps,
      lastDep: lastCompletedDep,
      errors: errors.length > 0 ? errors : undefined,
    });

    console.log(`   ${codeDep} ${nomDep}: ${patrimoineRows.length} patrimoine, ${plagesRows.length} plages, ${randoRows.length} randos`);
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`   ⚠ ${codeDep} ${nomDep}: erreur traitement — on continue —`, msg);
      errors.push({ dep: `${codeDep} ${nomDep}`, message: msg.slice(0, 80) });
      allPatrimoineRows.push(...patrimoineRows);
      allPlagesRows.push(...plagesRows);
      allRandosRows.push(...randoRows);
      doneCount++;
      lastCompletedDep = `${codeDep} ${nomDep} (erreur)`;
      writeProcessProgress({
        current: doneCount,
        total: totalDeps,
        lastDep: lastCompletedDep,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  }

  clearProcessProgress();

  const writeSheet = (name: string, headers: string[], rows: (string | number)[][]) => {
    const aoa = [headers, ...rows];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    wb.Sheets[name] = sheet;
  };

  writeSheet("Patrimoine", PATRIMOINE_HEADERS, allPatrimoineRows);
  writeSheet("Plages", PLAGES_HEADERS, allPlagesRows);
  writeSheet("Randos", RANDOS_HEADERS, allRandosRows);

  mkdirSync(CITIES_DIR, { recursive: true });
  XLSX.writeFile(wb, XLSX_PATH);

  console.log(`\n✓ Excel écrit : ${XLSX_PATH}`);
  console.log(`  Patrimoine: ${allPatrimoineRows.length}, Plages: ${allPlagesRows.length}, Randos: ${allRandosRows.length}`);
  console.log(`\n>> Étape suivante : npx tsx scripts/enrich-lieux-central.ts`);
}

main().catch((err) => {
  clearProcessProgress();
  console.error("Erreur:", err);
  process.exit(1);
});
