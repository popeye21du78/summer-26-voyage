/**
 * File de lieux pour l’outil maintenance « tri photos » (Commons).
 * Source : data/cities/lieux-central.json
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type MaintenanceLieuRow = {
  slug: string;
  nom: string;
  departement: string;
  code_dep: string;
  categorie_taille: string;
  score_esthetique: number;
  type_precis: string;
  lat: number | null;
  lng: number | null;
  raison: "ville_village_9_10" | "chateau_site" | "curated";
};

const JSON_PATH = join(process.cwd(), "data", "cities", "lieux-central.json");

type RawLieu = {
  source_type?: string;
  nom?: string;
  slug?: string;
  code_dep?: string;
  departement?: string;
  score_esthetique?: string;
  categorie_taille?: string;
  type_precis?: string;
  lat?: number;
  lng?: number;
  population?: number | string;
};

/** Slugs remarquables (complément aux règles automatiques). */
const CURATED_SLUGS = new Set<string>([
  "pont-du-gard",
  "chateau-de-chambord",
  "carcassonne",
  "mont-saint-michel",
  "chateau-de-chenonceau",
  "versailles",
  "chateau-de-fontainebleau",
]);

function estScore(raw: unknown): number {
  const n = parseInt(String(raw ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

function isVilleLike(cat: string): boolean {
  const c = cat.toLowerCase();
  return (
    c === "village" ||
    c === "hameau" ||
    c === "ville_moyenne" ||
    c === "grande_ville"
  );
}

function isChateauOrNature(cat: string): boolean {
  const c = cat.toLowerCase();
  return c === "chateau" || c === "site_naturel";
}

export function loadMaintenancePhotoQueue(): MaintenanceLieuRow[] {
  if (!existsSync(JSON_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as {
      lieux?: RawLieu[];
    };
    const lieux = data.lieux ?? [];
    const out: MaintenanceLieuRow[] = [];
    const seen = new Set<string>();

    for (const l of lieux) {
      if (l.source_type !== "patrimoine") continue;
      const slug = String(l.slug ?? "")
        .trim()
        .toLowerCase();
      if (!slug) continue;
      const cat = String(l.categorie_taille ?? "").trim();
      const est = estScore(l.score_esthetique);

      let raison: MaintenanceLieuRow["raison"] | null = null;

      if (CURATED_SLUGS.has(slug)) {
        raison = "curated";
      } else if (est >= 9 && isVilleLike(cat)) {
        raison = "ville_village_9_10";
      } else if (est >= 8 && isChateauOrNature(cat)) {
        raison = "chateau_site";
      }

      if (!raison) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);

      out.push({
        slug,
        nom: String(l.nom ?? slug).trim(),
        departement: String(l.departement ?? ""),
        code_dep: String(l.code_dep ?? ""),
        categorie_taille: cat,
        score_esthetique: est,
        type_precis: String(l.type_precis ?? ""),
        lat: typeof l.lat === "number" ? l.lat : null,
        lng: typeof l.lng === "number" ? l.lng : null,
        raison,
      });
    }

    out.sort((a, b) => {
      const d = a.departement.localeCompare(b.departement, "fr");
      if (d !== 0) return d;
      return a.nom.localeCompare(b.nom, "fr");
    });

    return out;
  } catch {
    return [];
  }
}

function popOf(l: RawLieu): number {
  if (typeof l.population === "number") return l.population;
  return parseInt(String(l.population ?? "0"), 10) || 0;
}

/** Grandes / moyennes villes pour l’onglet test Wikipedia / Commons. */
export function loadBigCitiesForWikiTest(limit = 100): MaintenanceLieuRow[] {
  if (!existsSync(JSON_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as {
      lieux?: RawLieu[];
    };
    const lieux = data.lieux ?? [];
    const tmp: Array<{ pop: number; row: MaintenanceLieuRow }> = [];

    for (const l of lieux) {
      if (l.source_type !== "patrimoine") continue;
      const cat = String(l.categorie_taille ?? "").toLowerCase();
      if (cat !== "grande_ville" && cat !== "ville_moyenne") continue;
      const slug = String(l.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      tmp.push({
        pop: popOf(l),
        row: {
          slug,
          nom: String(l.nom ?? "").trim(),
          departement: String(l.departement ?? ""),
          code_dep: String(l.code_dep ?? ""),
          categorie_taille: cat,
          score_esthetique: estScore(l.score_esthetique),
          type_precis: String(l.type_precis ?? ""),
          lat: typeof l.lat === "number" ? l.lat : null,
          lng: typeof l.lng === "number" ? l.lng : null,
          raison: "ville_village_9_10",
        },
      });
    }

    tmp.sort((a, b) => b.pop - a.pop);
    return tmp.slice(0, limit).map((t) => t.row);
  } catch {
    return [];
  }
}

let premiumPatrimoineSlugCache: Set<string> | null = null;

/** Lieux patrimoine « phares » : 9–10 esth. (villes/villages), châteaux/sites ≥ 8, liste éditoriale — mêmes règles que la file maintenance. */
export function isPremiumPatrimoineSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (!s) return false;
  if (!premiumPatrimoineSlugCache) {
    premiumPatrimoineSlugCache = new Set(loadMaintenancePhotoQueue().map((r) => r.slug));
  }
  return premiumPatrimoineSlugCache.has(s);
}
