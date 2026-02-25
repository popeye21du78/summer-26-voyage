/**
 * Ajoute la colonne famille_type au fichier lieux-central.xlsx.
 * Lit le JSON (qui doit avoir famille_type) et reporte les valeurs dans l'Excel.
 * Si le JSON n'a pas famille_type, exécute d'abord : npx tsx scripts/add-famille-type.ts
 *
 * Usage : npx tsx scripts/add-famille-type-to-excel.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const CITIES_DIR = join(process.cwd(), "data", "cities");
const JSON_PATH = join(CITIES_DIR, "lieux-central.json");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error("❌ lieux-central.xlsx introuvable.");
    process.exit(1);
  }
  if (!existsSync(JSON_PATH)) {
    console.error("❌ lieux-central.json introuvable. Lance d'abord l'export depuis l'Excel.");
    process.exit(1);
  }

  const jsonRaw = readFileSync(JSON_PATH, "utf-8");
  const jsonData = JSON.parse(jsonRaw) as { lieux?: Array<Record<string, unknown>> };
  const lieux = jsonData.lieux ?? [];

  const mapFamille = new Map<string, string>();
  for (const l of lieux) {
    const st = toStr(l.source_type);
    const codeDep = toStr(l.code_dep).padStart(2, "0");
    const slug = toStr(l.slug);
    const key = `${st}|${codeDep}|${slug}`;
    const famille = toStr(l.famille_type) || "autre";
    mapFamille.set(key, famille);
  }

  const buffer = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buffer, { type: "buffer" });

  function addFamilleToRow(
    r: Record<string, unknown>,
    sourceType: string,
    defaultFamille: string
  ): Record<string, unknown> {
    const codeDep = toStr(r.code_dep).padStart(2, "0");
    const slug = toStr(r.slug);
    const mapKey = `${sourceType}|${codeDep}|${slug}`;
    const famille = mapFamille.get(mapKey) ?? defaultFamille;
    const keys = Object.keys(r).filter((k) => k !== "famille_type");
    const insertIdx = keys.includes("type_precis") ? keys.indexOf("type_precis") + 1 : 0;
    keys.splice(insertIdx, 0, "famille_type");
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = k === "famille_type" ? famille : r[k];
    }
    return out;
  }

  // Patrimoine
  const patrimoine = XLSX.utils.sheet_to_json(wb.Sheets["Patrimoine"] ?? {}, { defval: "" }) as Record<string, unknown>[];
  const patrimoineRows = patrimoine.map((r) => addFamilleToRow(r, "patrimoine", "autre"));
  wb.Sheets["Patrimoine"] = XLSX.utils.json_to_sheet(patrimoineRows);

  // Plages
  const plages = XLSX.utils.sheet_to_json(wb.Sheets["Plages"] ?? {}, { defval: "" }) as Record<string, unknown>[];
  const plagesRows = plages.map((r) => addFamilleToRow(r, "plage", "plage"));
  wb.Sheets["Plages"] = XLSX.utils.json_to_sheet(plagesRows);

  // Randos
  const randos = XLSX.utils.sheet_to_json(wb.Sheets["Randos"] ?? {}, { defval: "" }) as Record<string, unknown>[];
  const randosRows = randos.map((r) => addFamilleToRow(r, "rando", "rando"));
  wb.Sheets["Randos"] = XLSX.utils.json_to_sheet(randosRows);

  writeFileSync(XLSX_PATH, XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
  console.log("✅ Colonne famille_type ajoutée à lieux-central.xlsx");
  console.log("   Patrimoine:", patrimoineRows.length, "| Plages:", plagesRows.length, "| Randos:", randosRows.length);
}

main();
