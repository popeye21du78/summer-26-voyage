/**
 * Supprime sous photos/type/ tout dossier qui n'est PAS un département.
 * On garde uniquement les noms de départements issus de lieux-central.json.
 * Usage : node scripts/remove-region-folders.mjs
 */
import { readdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const PHOTOS_ROOT = join(root, "photos");
const JSON_PATH = join(root, "data", "cities", "lieux-central.json");

function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Liste des vrais départements (noms attendus sous photos/type/)
let DEPARTEMENTS_NORM = new Set();
if (existsSync(JSON_PATH)) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  if (Array.isArray(data.lieux)) {
    for (const lieu of data.lieux) {
      const d = String(lieu.departement ?? "").trim();
      if (d) DEPARTEMENTS_NORM.add(norm(d));
    }
  }
}

// Au cas où le JSON serait absent, liste de secours (départements français)
const FALLBACK_DEP = new Set([
  "ain", "aisne", "allier", "alpes-de-haute-provence", "hautes-alpes", "alpes-maritimes", "ardeche",
  "ardennes", "ariege", "aube", "aude", "aveyron", "bouches-du-rhone", "calvados", "cantal", "charente",
  "charente-maritime", "cher", "correze", "cote-d'or", "cotes-d'armor", "creuse", "dordogne", "doubs",
  "drome", "eure", "eure-et-loir", "finistere", "gard", "haute-garonne", "gers", "gironde", "herault",
  "ille-et-vilaine", "indre", "indre-et-loire", "isere", "jura", "landes", "loir-et-cher", "loire",
  "haute-loire", "loire-atlantique", "loiret", "lot", "lot-et-garonne", "lozere", "maine-et-loire",
  "manche", "marne", "haute-marne", "mayenne", "meurthe-et-moselle", "meuse", "morbihan", "moselle",
  "nievre", "nord", "oise", "orne", "pas-de-calais", "puy-de-dome", "pyrenees-atlantiques",
  "hautes-pyrenees", "pyrenees-orientales", "bas-rhin", "haute-rhin", "rhone", "haute-saone",
  "saone-et-loire", "sarthe", "savoie", "haute-savoie", "paris", "seine-maritime", "seine-et-marne",
  "yvelines", "deux-sevres", "somme", "tarn", "tarn-et-garonne", "var", "vaucluse", "vendee", "vienne",
  "haute-vienne", "vosges", "yonne", "territoire de belfort", "essonne", "hauts-de-seine",
  "seine-saint-denis", "val-de-marne", "val-d'oise", "corse-du-sud", "haute-corse",
]);
if (DEPARTEMENTS_NORM.size === 0) DEPARTEMENTS_NORM = FALLBACK_DEP;

function isDepartement(folderName) {
  return DEPARTEMENTS_NORM.has(norm(folderName));
}

if (!existsSync(PHOTOS_ROOT)) {
  console.log("Aucun dossier photos à traiter.");
  process.exit(0);
}

let removed = 0;
for (const typeDir of readdirSync(PHOTOS_ROOT, { withFileTypes: true })) {
  if (!typeDir.isDirectory() || typeDir.name === "README.md") continue;
  const typePath = join(PHOTOS_ROOT, typeDir.name);
  for (const sub of readdirSync(typePath, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    if (isDepartement(sub.name)) continue; // garder les vrais départements
    const pathToRemove = join(typePath, sub.name);
    try {
      rmSync(pathToRemove, { recursive: true });
      removed++;
      console.log("Supprimé :", join(typeDir.name, sub.name));
    } catch (e) {
      console.warn("⚠", pathToRemove, e.message);
    }
  }
}
console.log("✅ Dossiers supprimés (régions ou autres) :", removed);
