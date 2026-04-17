/**
 * Génère data/maintenance/public-photo-client-index.json à partir des JSON
 * maintenance (même logique de priorité que lib/public-photo-url.ts côté fichier local).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const maintenance = path.join(root, "data", "maintenance");

function listValidatedUrls(entry) {
  if (!entry || entry.status !== "validated") return [];
  if (Array.isArray(entry.photos) && entry.photos.length)
    return entry.photos.map((p) => p.url).filter(Boolean);
  if (entry.photo?.url) return [entry.photo.url];
  return [];
}

function beautyUrls(entry) {
  if (!entry || entry.skipped) return [];
  const pick = entry.unsplashPhotos?.length
    ? entry.unsplashPhotos
    : entry.commonsPhotos;
  return (pick ?? []).map((p) => p.url).filter(Boolean);
}

function norm(s) {
  return String(s).trim().toLowerCase();
}

const rawVal = JSON.parse(
  fs.readFileSync(path.join(maintenance, "photo-validations.json"), "utf-8")
);
const rawBeauty = JSON.parse(
  fs.readFileSync(path.join(maintenance, "beauty-200-validations.json"), "utf-8")
);

const validations = {};
for (const [k, entry] of Object.entries(rawVal)) {
  const urls = listValidatedUrls(entry);
  if (urls.length) validations[norm(k)] = urls;
}

const beauty = {};
for (const [k, entry] of Object.entries(rawBeauty)) {
  const urls = beautyUrls(entry);
  if (urls.length) beauty[norm(k)] = urls;
}

const out = {
  validations,
  beauty,
  generatedAt: new Date().toISOString(),
};

const outPath = path.join(maintenance, "public-photo-client-index.json");
fs.writeFileSync(outPath, JSON.stringify(out), "utf-8");
console.log(
  `Wrote ${outPath} (${Object.keys(validations).length} validation slugs, ${Object.keys(beauty).length} beauty slugs)`
);
