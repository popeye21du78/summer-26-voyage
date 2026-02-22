/**
 * Applique des largeurs de colonnes à lieux-central.xlsx (v4 : 3 onglets).
 * Usage : npx tsx scripts/set-excel-column-widths.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const XLSX_PATH = join(process.cwd(), "data", "cities", "lieux-central.xlsx");

const COLS: Record<string, number[]> = {
  Patrimoine: [8, 22, 28, 22, 28, 24, 24, 20, 6, 6, 6, 45, 35, 10, 10, 8, 14, 6, 10],
  Plages: [8, 22, 28, 22, 32, 18, 12, 6, 8, 8, 45, 10, 10],
  Randos: [8, 22, 28, 22, 22, 45, 10, 10, 8, 8, 8, 10, 10],
};

if (!existsSync(XLSX_PATH)) {
  console.error("lieux-central.xlsx introuvable.");
  process.exit(1);
}

const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
for (const name of Object.keys(COLS)) {
  const sheet = wb.Sheets[name];
  if (sheet) {
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    const numCols = aoa[0]?.length ?? 0;
    sheet["!cols"] = COLS[name].slice(0, numCols).map((w) => ({ wch: w }));
  }
}
writeFileSync(XLSX_PATH, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("Largeurs de colonnes appliquées:", XLSX_PATH);
