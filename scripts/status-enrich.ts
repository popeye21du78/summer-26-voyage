/**
 * Affiche l'état de l'enrichissement — à lancer pour voir où on en est.
 * Usage : npx tsx scripts/status-enrich.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const CITIES_DIR = join(process.cwd(), "data", "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const PROGRESS_PATH = join(CITIES_DIR, ".enrich-progress.json");

function main() {
  console.log("\n═══ ÉTAT ENRICHISSEMENT ═══\n");

  if (existsSync(PROGRESS_PATH)) {
    try {
      const raw = readFileSync(PROGRESS_PATH, "utf-8");
      const p = JSON.parse(raw) as { sheet?: string; current?: number; total?: number };
      const pct = p.total ? Math.round((100 * (p.current ?? 0)) / p.total) : 0;
      console.log("📌 EN COURS");
      console.log(`   Onglet : ${p.sheet ?? "?"}`);
      console.log(`   Progression : ${p.current ?? 0} / ${p.total ?? 0} (${pct}%)`);
      console.log("   → Le script tourne en arrière-plan.\n");
    } catch {
      console.log("⚠ Fichier .enrich-progress.json illisible\n");
    }
  } else {
    console.log("📌 Pas d'enrichissement en cours (fichier .enrich-progress.json absent)\n");
  }

  if (!existsSync(XLSX_PATH)) {
    console.log("Excel introuvable.");
    return;
  }

  const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
  const p = XLSX.utils.sheet_to_json(wb.Sheets["Patrimoine"] ?? {}, { defval: "" }) as Array<{ lat?: number; lng?: number }>;
  const pl = XLSX.utils.sheet_to_json(wb.Sheets["Plages"] ?? {}, { defval: "" }) as Array<{ lat?: number; lng?: number }>;
  const r = XLSX.utils.sheet_to_json(wb.Sheets["Randos"] ?? {}, { defval: "" }) as Array<{ lat_depart?: number; lng_depart?: number }>;

  const pHas = p.filter((x) => x.lat && x.lng).length;
  const plHas = pl.filter((x) => x.lat && x.lng).length;
  const rHas = r.filter((x) => x.lat_depart && x.lng_depart).length;

  console.log("--- EXCEL (lieux-central.xlsx) ---");
  console.log(`   Patrimoine : ${pHas} / ${p.length} avec lat/lng`);
  console.log(`   Plages    : ${plHas} / ${pl.length} avec lat/lng`);
  console.log(`   Randos    : ${rHas} / ${r.length} avec coords`);
  console.log("");
}

main();
