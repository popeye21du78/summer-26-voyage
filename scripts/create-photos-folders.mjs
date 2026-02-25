/**
 * Crée l'arborescence photos / type / département / site
 * Usage : node scripts/create-photos-folders.mjs
 */
import { mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const JSON_PATH = join(root, "data", "cities", "lieux-central.json");
const PHOTOS_ROOT = join(root, "photos");

function sanitizeDirName(name) {
  return String(name).replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

if (!existsSync(JSON_PATH)) {
  console.error("❌ Fichier introuvable :", JSON_PATH);
  process.exit(1);
}

const data = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const lieux = data.lieux;
if (!Array.isArray(lieux)) {
  console.error("❌ Structure invalide : lieux attendu");
  process.exit(1);
}

const created = new Set();
let count = 0;

for (const lieu of lieux) {
  const codeDepRaw = String(lieu.code_dep ?? "").trim();
  const codeDep = codeDepRaw.length === 1 ? codeDepRaw.padStart(2, "0") : codeDepRaw;
  if (!codeDep || !lieu.departement) continue;

  const typeFamille = (lieu.famille_type || lieu.source_type || "autre").toLowerCase();
  const departement = String(lieu.departement ?? "").trim();
  const slug = (lieu.slug || lieu.nom || "sans-nom").toString().replace(/[/\\:*?"<>|]/g, "-").trim() || "sans-nom";

  const typeDir = sanitizeDirName(typeFamille);
  const depDir = sanitizeDirName(departement);
  const fullPath = join(PHOTOS_ROOT, typeDir, depDir, slug);

  if (!created.has(fullPath)) {
    try {
      mkdirSync(fullPath, { recursive: true });
      created.add(fullPath);
      count++;
    } catch (e) {
      console.warn("⚠", fullPath, e.message);
    }
  }
}

console.log("✅ Arborescence créée sous :", PHOTOS_ROOT);
console.log("   Dossiers (sites) créés :", count);
console.log("   Structure : type → département → site (slug)");
