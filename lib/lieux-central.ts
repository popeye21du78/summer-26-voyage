/**
 * Lecture de data/cities/lieux-central.xlsx (4 onglets : Patrimoine, Pépites, Plages, Randos).
 * Une seule source centralisée pour tous les départements.
 */

import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import type { LieuPoint, LieuType } from "./lieux-types";

const CITIES_DIR = path.join(process.cwd(), "data", "cities");
const XLSX_PATH = path.join(CITIES_DIR, "lieux-central.xlsx");

function slugFromNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
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

function toString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function rowToLieu(
  row: Record<string, unknown>,
  type: LieuType,
  codeDep: string,
  departement: string
): LieuPoint | null {
  const nom = toString(row.nom).trim();
  if (!nom) return null;

  const slug = toString(row.slug).trim() || slugFromNom(nom);
  const id = `${type}-${codeDep}-${slug}`;

  let lat = toNum(row.lat);
  let lng = toNum(row.lng);
  if (type === "rando" && (lat == null || lng == null)) {
    lat = toNum(row.lat_depart) ?? null;
    lng = toNum(row.lng_depart) ?? null;
  }
  if (lat == null || lng == null) return null;

  const plusBeaux = toString(row.plus_beaux_villages).toLowerCase();
  const plus_beaux_villages: "oui" | "non" =
    plusBeaux === "oui" ? "oui" : "non";

  return {
    id,
    nom,
    slug,
    departement: departement || toString(row.departement),
    code_dep: codeDep || toString(row.code_dep),
    type,
    lat,
    lng,
    plus_beaux_villages: type === "patrimoine" || type === "pepite" ? plus_beaux_villages : undefined,
  };
}

function sheetToLieux(
  workbook: XLSX.WorkBook,
  sheetName: string,
  type: LieuType
): LieuPoint[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  const lieux: LieuPoint[] = [];

  for (const row of rows) {
    const codeDep = toString(row.code_dep).trim() || "";
    const dep = toString(row.departement).trim() || "";
    const p = rowToLieu(row, type, codeDep, dep);
    if (p) lieux.push(p);
  }

  return lieux;
}

/**
 * Charge tous les lieux depuis lieux-central.xlsx.
 * Seuls les lieux avec lat/lng renseignés sont retournés (affichables sur la carte).
 * @param filterCodeDep - optionnel : filtrer par code département (ex. "13")
 */
export function getLieuxFromCentral(filterCodeDep?: string): LieuPoint[] {
  try {
    if (!fs.existsSync(XLSX_PATH)) return [];

    const buffer = fs.readFileSync(XLSX_PATH);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const patrimoine = sheetToLieux(workbook, "Patrimoine", "patrimoine");
    const pepites = sheetToLieux(workbook, "Pépites", "pepite");
    const plages = sheetToLieux(workbook, "Plages", "plage");
    const randos = sheetToLieux(workbook, "Randos", "rando");

    let all: LieuPoint[] = [...patrimoine, ...pepites, ...plages, ...randos];

    if (filterCodeDep && filterCodeDep.trim()) {
      const code = filterCodeDep.trim();
      all = all.filter((l) => l.code_dep === code);
    }

    return all;
  } catch (e) {
    console.warn("getLieuxFromCentral:", e);
    return [];
  }
}

/**
 * Liste des codes départements présents dans le classement (pour le filtre carte).
 */
export function getDepartementsList(): { code: string; departement: string }[] {
  try {
    const classementPath = path.join(process.cwd(), "data", "departements", "classement.json");
    if (!fs.existsSync(classementPath)) return [];

    const raw = fs.readFileSync(classementPath, "utf-8");
    const data = JSON.parse(raw) as { classement: Array<{ code: string; departement: string }> };
    return Array.isArray(data.classement) ? data.classement : [];
  } catch {
    return [];
  }
}

export type LieuxStats = {
  byDepartement: Array<{ code_dep: string; departement: string; patrimoine: number; pepite: number; plage: number; rando: number; total: number }>;
  byType: { patrimoine: number; pepite: number; plage: number; rando: number; total: number };
};

/**
 * Compte les lieux par département et par type (toutes lignes avec un nom, avec ou sans coords).
 */
export function getLieuxStats(): LieuxStats {
  try {
    if (!fs.existsSync(XLSX_PATH)) return { byDepartement: [], byType: { patrimoine: 0, pepite: 0, plage: 0, rando: 0, total: 0 } };

    const buffer = fs.readFileSync(XLSX_PATH);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const countSheet = (sheetName: string): Array<{ code_dep: string; departement: string }> => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
      return rows
        .filter((r) => toString(r.nom).trim())
        .map((r) => ({ code_dep: toString(r.code_dep), departement: toString(r.departement) }));
    };

    const patrimoine = countSheet("Patrimoine");
    const pepites = countSheet("Pépites");
    const plages = countSheet("Plages");
    const randos = countSheet("Randos");

    const depMap = new Map<string, { departement: string; patrimoine: number; pepite: number; plage: number; rando: number }>();

    for (const p of patrimoine) {
      const key = p.code_dep || "?";
      let d = depMap.get(key);
      if (!d) { d = { departement: p.departement, patrimoine: 0, pepite: 0, plage: 0, rando: 0 }; depMap.set(key, d); }
      d.patrimoine++;
    }
    for (const p of pepites) {
      const key = p.code_dep || "?";
      let d = depMap.get(key);
      if (!d) { d = { departement: p.departement, patrimoine: 0, pepite: 0, plage: 0, rando: 0 }; depMap.set(key, d); }
      d.pepite++;
    }
    for (const p of plages) {
      const key = p.code_dep || "?";
      let d = depMap.get(key);
      if (!d) { d = { departement: p.departement, patrimoine: 0, pepite: 0, plage: 0, rando: 0 }; depMap.set(key, d); }
      d.plage++;
    }
    for (const r of randos) {
      const key = r.code_dep || "?";
      let d = depMap.get(key);
      if (!d) { d = { departement: r.departement, patrimoine: 0, pepite: 0, plage: 0, rando: 0 }; depMap.set(key, d); }
      d.rando++;
    }

    const byDepartement = Array.from(depMap.entries())
      .map(([code_dep, d]) => ({
        code_dep,
        departement: d.departement,
        patrimoine: d.patrimoine,
        pepite: d.pepite,
        plage: d.plage,
        rando: d.rando,
        total: d.patrimoine + d.pepite + d.plage + d.rando,
      }))
      .filter((d) => d.code_dep && d.code_dep !== "?")
      .sort((a, b) => a.code_dep.localeCompare(b.code_dep));

    const byType = {
      patrimoine: patrimoine.length,
      pepite: pepites.length,
      plage: plages.length,
      rando: randos.length,
      total: patrimoine.length + pepites.length + plages.length + randos.length,
    };

    return { byDepartement, byType };
  } catch (e) {
    console.warn("getLieuxStats:", e);
    return { byDepartement: [], byType: { patrimoine: 0, pepite: 0, plage: 0, rando: 0, total: 0 } };
  }
}
