/**
 * Exporte les lieux `lieux-central.json` par région carte inspiration
 * (même filtre départements que l’API /api/inspiration/lieux-region).
 *
 * npx tsx scripts/generate-inspiration-poi-lists.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { MAP_REGIONS } from "../lib/inspiration-map-regions-config";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "../lib/inspiration-lieux-region";

const ROOT = path.join(__dirname, "..");
const LIEUX_PATH = path.join(ROOT, "data", "cities", "lieux-central.json");
const OUT_DIR = path.join(ROOT, "content", "inspiration", "poi-lists");

function main() {
  const raw = JSON.parse(fs.readFileSync(LIEUX_PATH, "utf8")) as {
    lieux?: LieuCentralRow[];
  };
  const lieux = Array.isArray(raw.lieux) ? raw.lieux : [];
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const index: {
    generatedAt: string;
    source: string;
    regions: { regionId: string; name: string; count: number; file: string }[];
  } = {
    generatedAt: new Date().toISOString(),
    source: "data/cities/lieux-central.json + lib/inspiration-map-regions-config",
    regions: [],
  };

  for (const r of MAP_REGIONS) {
    const inRegion = filterLieuxByMapRegion(lieux, r.id);
    const rows = inRegion
      .map((l) => ({ slug: l.slug, nom: l.nom.trim() }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

    const payload = {
      regionId: r.id,
      name: r.name,
      deptCodes: r.deptCodes,
      count: rows.length,
      lieux: rows,
    };

    const file = `${r.id}.json`;
    fs.writeFileSync(
      path.join(OUT_DIR, file),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
    index.regions.push({
      regionId: r.id,
      name: r.name,
      count: rows.length,
      file,
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "_index.json"),
    JSON.stringify(index, null, 2),
    "utf8"
  );

  console.log(
    index.regions
      .map((x) => `${x.regionId}: ${x.count} lieux → ${x.file}`)
      .join("\n")
  );
  console.log(`\nÉcrit dans ${OUT_DIR}`);
}

main();
