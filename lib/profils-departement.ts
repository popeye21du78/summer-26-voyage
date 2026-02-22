/**
 * Charge les profils départementaux (classement, côtier, rando) et expose
 * le contexte d'un seul département pour remplir le prompt à trous.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

function resolveDataDep(): string {
  // Stratégie 1 : import.meta.url (fiable avec tsx en mode ESM)
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const candidate = join(thisDir, "..", "data", "departements");
    if (existsSync(join(candidate, "classement.json"))) return candidate;
  } catch {}

  // Stratégie 2 : __dirname (CJS ou tsx compat)
  if (typeof __dirname === "string") {
    const candidate = join(__dirname, "..", "data", "departements");
    if (existsSync(join(candidate, "classement.json"))) return candidate;
  }

  // Stratégie 3 : process.cwd() (fallback)
  const candidate = join(process.cwd(), "data", "departements");
  if (existsSync(join(candidate, "classement.json"))) return candidate;

  console.error("❌ Impossible de trouver data/departements/classement.json !");
  console.error("   Chemins testés :");
  try { console.error("   - import.meta.url →", dirname(fileURLToPath(import.meta.url))); } catch {}
  if (typeof __dirname === "string") console.error("   - __dirname →", __dirname);
  console.error("   - process.cwd() →", process.cwd());
  return candidate;
}

const DATA_DEP = resolveDataDep();

export type ProfilCotier = {
  code: string;
  departement: string;
  cotier: boolean;
  facade: string | null;
  type_cote: string[] | null;
  surf: boolean;
  criques: boolean;
  nb_plages: number;
  lacs_baignables: boolean;
  nb_plages_lac: number;
};

export type ProfilRando = {
  code: string;
  departement: string;
  tier_rando: string;
  type_rando: string[];
  nb_randos: number;
  denivele_typique: string;
  justification: string;
};

export type ClassementEntry = {
  code: string;
  departement: string;
  tier: string;
};

export type ContexteDepartement = {
  code: string;
  nomDepartement: string;
  tier: string;
  /** Nombre total d'entrées patrimoine (communes + sites isolés + pépites fusionnés). */
  nbPatrimoine: number;
  /** Au moins ce nombre d'entrées doivent avoir score_pepite >= 7 (villages hors radar). */
  nbPepitesMin: number;
  /** Profil côtier : null si fichier absent. */
  cotier: ProfilCotier | null;
  /** Profil rando : null si fichier absent. */
  rando: ProfilRando | null;
  /** Nombre de plages à demander (nb_plages + nb_plages_lac). */
  nbPlages: number;
  /** Nombre de randos à demander (0 si tier D ou pas de profils). */
  nbRandos: number;
};

function loadJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    console.warn(`   ⚠ Fichier introuvable : ${filePath}`);
    return null;
  }
  try {
    let raw = readFileSync(filePath, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`   ❌ Erreur de parsing JSON : ${filePath}`, err);
    return null;
  }
}

/** Charge le contexte d'un seul département à partir des 3 fichiers de config. */
export function getContexteDepartement(
  codeDep: string,
  nbPatrimoineByTier: Record<string, number>,
  nbPepitesMinByTier: Record<string, number>
): ContexteDepartement | null {
  const classementPath = join(DATA_DEP, "classement.json");
  const classementData = loadJson<{ classement: ClassementEntry[] }>(classementPath);
  const classement = classementData?.classement;
  if (!Array.isArray(classement)) return null;

  const entry = classement.find((e) => String(e.code) === String(codeDep));
  if (!entry) return null;

  const tier = entry.tier;
  const nbPatrimoine = nbPatrimoineByTier[tier] ?? 25;
  const nbPepitesMin = nbPepitesMinByTier[tier] ?? 5;

  const cotiersPath = join(DATA_DEP, "profils-cotiers.json");
  const randosPath = join(DATA_DEP, "profils-randos.json");
  console.log(`   [profils] DATA_DEP = ${DATA_DEP}`);
  console.log(`   [profils] classement.json  → ${existsSync(join(DATA_DEP, "classement.json")) ? "✓" : "✗"}`);
  console.log(`   [profils] profils-cotiers  → ${existsSync(cotiersPath) ? "✓" : "✗"}`);
  console.log(`   [profils] profils-randos   → ${existsSync(randosPath) ? "✓" : "✗"}`);

  const cotiersData = loadJson<{ departements: ProfilCotier[] }>(cotiersPath);
  const norm = (s: string) => String(s).trim();
  const cotier = cotiersData?.departements?.find((d) => norm(d.code) === norm(codeDep)) ?? null;

  const randosData = loadJson<{ departements: ProfilRando[] }>(randosPath);
  const rando = randosData?.departements?.find((d) => norm(d.code) === norm(codeDep)) ?? null;

  const nbPlages = cotier ? (cotier.nb_plages || 0) + (cotier.nb_plages_lac || 0) : 0;
  const nbRandos = rando?.nb_randos ?? 0;

  if (!cotier) console.warn(`   ⚠ Pas de profil côtier trouvé pour code "${codeDep}" (cotierData=${cotiersData ? "chargé" : "null"}, ${cotiersData?.departements?.length ?? 0} entrées)`);
  if (!rando) console.warn(`   ⚠ Pas de profil rando trouvé pour code "${codeDep}" (randoData=${randosData ? "chargé" : "null"}, ${randosData?.departements?.length ?? 0} entrées)`);

  return {
    code: entry.code,
    nomDepartement: entry.departement,
    tier,
    nbPatrimoine,
    nbPepitesMin,
    cotier,
    rando,
    nbPlages,
    nbRandos,
  };
}
