/**
 * Crée l'arborescence de dossiers pour les photos :
 *   photos / {type} / {département} / {site}
 * à partir de data/cities/lieux-central.json (données issues de l'Excel).
 *
 * Usage : npx tsx scripts/create-photos-folders.ts
 */

import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { readFileSync } from "fs";

const DATA_DIR = join(process.cwd(), "data", "cities");
const PHOTOS_ROOT = join(process.cwd(), "photos");
const JSON_PATH = join(DATA_DIR, "lieux-central.json");

/** Caractères à remplacer pour noms de dossiers Windows */
function sanitizeDirName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

type Lieu = {
  source_type?: string;
  code_dep?: string;
  departement?: string;
  nom?: string;
  slug?: string;
  famille_type?: string;
  [key: string]: unknown;
};

function main() {
  if (!existsSync(JSON_PATH)) {
    console.error("❌ Fichier introuvable :", JSON_PATH);
    console.error("   Exécutez d'abord : npx tsx scripts/export-lieux-central-to-csv.ts --json");
    process.exit(1);
  }

  const raw = readFileSync(JSON_PATH, "utf-8");
  const data = JSON.parse(raw) as { lieux?: Lieu[] };
  if (!Array.isArray(data.lieux)) {
    console.error("❌ Structure invalide : lieux attendu dans", JSON_PATH);
    process.exit(1);
  }

  const created = new Set<string>();
  let count = 0;

  for (const lieu of data.lieux) {
    const codeDepRaw = String(lieu.code_dep ?? "").trim();
    const codeDep = codeDepRaw.length === 1 ? codeDepRaw.padStart(2, "0") : codeDepRaw;
    if (!codeDep || !lieu.departement) continue;

    const typeFamille = (lieu.famille_type || lieu.source_type || "autre").toLowerCase();
    const departement = String(lieu.departement ?? "").trim();
    const slug = (lieu.slug || lieu.nom || "sans-nom")
      .toString()
      .replace(/[/\\:*?"<>|]/g, "-")
      .trim() || "sans-nom";

    const typeDir = sanitizeDirName(typeFamille);
    const depDir = sanitizeDirName(departement);

    const pathParts = [PHOTOS_ROOT, typeDir, depDir, slug];
    const fullPath = join(...pathParts);

    if (!created.has(fullPath)) {
      try {
        mkdirSync(fullPath, { recursive: true });
        created.add(fullPath);
        count++;
      } catch (e) {
        console.warn("⚠ Impossible de créer", fullPath, e);
      }
    }
  }

  console.log("✅ Arborescence créée sous :", PHOTOS_ROOT);
  console.log("   Dossiers (sites) créés :", count);
  console.log("   Structure : type → département → site (slug)");
}

main();
