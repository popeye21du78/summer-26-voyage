/**
 * Top 200 lieux patrimoine les « plus beaux » : tri score esthétique puis population.
 * Les corrections de note (maintenance) priment sur la fiche JSON.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getScoreEsthetiqueOverridesMap } from "./maintenance-beauty-validations";

const JSON_PATH = join(process.cwd(), "data", "cities", "lieux-central.json");

export const BEAUTY_TOP_LIMIT = 200;

export type BeautyTopRow = {
  rank: number;
  slug: string;
  nom: string;
  departement: string;
  code_dep: string;
  categorie_taille: string;
  /** Note effective pour le tri (override maintenance ou fiche). */
  score_esthetique: number;
  /** Note lue dans lieux-central.json (sans override). */
  score_esthetique_fiche: number;
  population: number;
  /** Plus Beaux Villages de France. */
  is_pbvf: boolean;
};

type RawLieu = {
  source_type?: string;
  nom?: string;
  slug?: string;
  code_dep?: string;
  departement?: string;
  score_esthetique?: string;
  categorie_taille?: string;
  population?: number | string;
  type_precis?: string;
  plus_beaux_villages?: string;
};

/** Plus Beaux Villages de France (fiche patrimoine). */
export function isLieuPbvf(l: Pick<RawLieu, "source_type" | "type_precis" | "plus_beaux_villages">): boolean {
  if (l.source_type !== "patrimoine") return false;
  const pb = String(l.plus_beaux_villages ?? "").toLowerCase();
  if (pb === "oui") return true;
  return String(l.type_precis ?? "").includes("Plus Beaux Villages de France");
}

function estScore(raw: unknown): number {
  const n = parseInt(String(raw ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

function popOf(l: RawLieu): number {
  if (typeof l.population === "number") return l.population;
  return parseInt(String(l.population ?? "0"), 10) || 0;
}

/** Tous les lieux patrimoine triés (note eff. puis pop.), sans limite — `rank` provisoire 0. */
function loadSortedPatrimoineBeautyRows(): BeautyTopRow[] {
  if (!existsSync(JSON_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as { lieux?: RawLieu[] };
    const lieux = data.lieux ?? [];
    const tmp: BeautyTopRow[] = [];
    const seen = new Set<string>();
    const overrides = getScoreEsthetiqueOverridesMap();

    for (const l of lieux) {
      if (l.source_type !== "patrimoine") continue;
      const slug = String(l.slug ?? "")
        .trim()
        .toLowerCase();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const fiche = estScore(l.score_esthetique);
      const effective = overrides[slug] ?? fiche;
      tmp.push({
        rank: 0,
        slug,
        nom: String(l.nom ?? slug).trim(),
        departement: String(l.departement ?? ""),
        code_dep: String(l.code_dep ?? ""),
        categorie_taille: String(l.categorie_taille ?? ""),
        score_esthetique: effective,
        score_esthetique_fiche: fiche,
        population: popOf(l),
        is_pbvf: isLieuPbvf(l),
      });
    }

    tmp.sort((a, b) => {
      if (b.score_esthetique !== a.score_esthetique) return b.score_esthetique - a.score_esthetique;
      if (b.population !== a.population) return b.population - a.population;
      return a.nom.localeCompare(b.nom, "fr");
    });

    return tmp;
  } catch {
    return [];
  }
}

export function loadTop200BeautyQueue(): BeautyTopRow[] {
  const rows = loadSortedPatrimoineBeautyRows();
  return rows.slice(0, BEAUTY_TOP_LIMIT).map((row, i) => ({ ...row, rank: i + 1 }));
}

/** Tous les Plus Beaux Villages de France (patrimoine), même tri — pour la suite après le top 200. */
export function loadPbvfBeautyQueue(): BeautyTopRow[] {
  return loadSortedPatrimoineBeautyRows()
    .filter((r) => r.is_pbvf)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/** Tout le patrimoine (lieux-central), tri note + population — pour maintenance « tous les lieux ». */
export function loadAllPatrimoineBeautyQueue(): BeautyTopRow[] {
  return loadSortedPatrimoineBeautyRows().map((row, i) => ({ ...row, rank: i + 1 }));
}

export function getBeautyTopRow(slug: string): BeautyTopRow | undefined {
  const s = slug.trim().toLowerCase();
  return loadTop200BeautyQueue().find((r) => r.slug === s);
}

/** Tout lieu patrimoine connu dans lieux-central — validations / notes maintenance autorisées. */
export function getBeautyMaintenanceRow(slug: string): BeautyTopRow | undefined {
  const s = slug.trim().toLowerCase();
  const rows = loadSortedPatrimoineBeautyRows();
  const i = rows.findIndex((r) => r.slug === s);
  if (i < 0) return undefined;
  return { ...rows[i], rank: i + 1 };
}
