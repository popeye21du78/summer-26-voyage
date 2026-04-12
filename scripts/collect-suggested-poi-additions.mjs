/**
 * Agrège suggestedPoiAdditions depuis star-itineraries-editorial/*.json
 * → content/inspiration/POI-SUGGERES-AJOUT.md
 *
 * node scripts/collect-suggested-poi-additions.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ED = join(ROOT, "content", "inspiration", "star-itineraries-editorial");
const OUT = join(ROOT, "content", "inspiration", "POI-SUGGERES-AJOUT.md");

const rows = [];
for (const name of readdirSync(ED)) {
  if (!name.endsWith(".json") || name.startsWith("_")) continue;
  const regionId = name.replace(/\.json$/, "");
  let data;
  try {
    data = JSON.parse(readFileSync(join(ED, name), "utf8"));
  } catch {
    continue;
  }
  for (const it of data.itineraries ?? []) {
    for (const s of it.suggestedPoiAdditions ?? []) {
      rows.push({
        regionId,
        itinerarySlug: it.itinerarySlug,
        nom: s.nom,
        type: s.type,
        raison: s.raison,
      });
    }
  }
}

let md = `# POI suggérés à ajouter au référentiel\n\n`;
md += `Généré automatiquement (${rows.length} entrées). Régénérer : \`node scripts/collect-suggested-poi-additions.mjs\`\n\n`;
md += `| Région | Itinéraire | Nom | Type | Raison |\n`;
md += `|--------|------------|-----|------|--------|\n`;
for (const r of rows) {
  const esc = (x) =>
    String(x ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  md += `| ${esc(r.regionId)} | ${esc(r.itinerarySlug)} | ${esc(r.nom)} | ${esc(r.type)} | ${esc(r.raison)} |\n`;
}

writeFileSync(OUT, md, "utf8");
console.log("OK", OUT, rows.length, "lignes");
