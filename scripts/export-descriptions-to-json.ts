/**
 * Consolide toutes les descriptions en un seul fichier JSON.
 *
 * Sources (priorité) :
 * 1. data/descriptions/{slug}-raw-fixed.txt (validé)
 * 2. data/descriptions/{slug}-raw.txt
 * 3. data/batch-desc/batch_output_lot*.jsonl (si pas de fichier txt)
 *
 * Usage :
 *   npx tsx scripts/export-descriptions-to-json.ts
 *   npx tsx scripts/export-descriptions-to-json.ts --output data/cities/descriptions.json
 *
 * Sortie : data/descriptions.json (ou chemin spécifié)
 * Format : { "slug": "contenu texte...", ... }
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const DESCRIPTIONS_DIR = join(DATA_DIR, "descriptions");
const BATCH_DIR = join(DATA_DIR, "batch-desc");
const DEFAULT_OUTPUT = join(DATA_DIR, "descriptions.json");

interface BatchResultLine {
  custom_id: string;
  response?: {
    body?: {
      choices?: Array<{ message?: { content?: string } }>;
    };
  };
  error?: { message: string };
}

function main() {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf("--output");
  const outputPath =
    outputIdx >= 0 && args[outputIdx + 1]
      ? args[outputIdx + 1]
      : DEFAULT_OUTPUT;

  const descriptions: Record<string, string> = {};

  // 1. Lire data/descriptions/*.txt (priorité -raw-fixed > -raw)
  if (existsSync(DESCRIPTIONS_DIR)) {
    const files = readdirSync(DESCRIPTIONS_DIR);
    // D'abord tous les -raw-fixed
    for (const f of files) {
      if (!f.endsWith("-raw-fixed.txt")) continue;
      const slug = f.replace(/-raw-fixed\.txt$/, "").toLowerCase();
      if (!slug) continue;
      descriptions[slug] = readFileSync(
        join(DESCRIPTIONS_DIR, f),
        "utf-8"
      ).trim();
    }
    // Puis les -raw pour les slugs non couverts
    for (const f of files) {
      if (!f.endsWith("-raw.txt") || f.endsWith("-raw-fixed.txt")) continue;
      const slug = f.replace(/-raw\.txt$/, "").toLowerCase();
      if (!slug || descriptions[slug]) continue;
      descriptions[slug] = readFileSync(
        join(DESCRIPTIONS_DIR, f),
        "utf-8"
      ).trim();
    }
  }

  // 2. Compléter avec batch_output_lot*.jsonl pour les slugs manquants
  if (existsSync(BATCH_DIR)) {
    const batchFiles = readdirSync(BATCH_DIR)
      .filter((f) => /^batch_output_lot\d+\.jsonl$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)![0], 10);
        const nb = parseInt(b.match(/\d+/)![0], 10);
        return na - nb;
      });

    for (const bf of batchFiles) {
      const lines = readFileSync(join(BATCH_DIR, bf), "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean);

      for (const line of lines) {
        try {
          const result: BatchResultLine = JSON.parse(line);
          const slug = result.custom_id?.toLowerCase();
          if (!slug || descriptions[slug]) continue;

          if (result.error) continue;

          const content =
            result.response?.body?.choices?.[0]?.message?.content;
          if (content?.trim()) {
            descriptions[slug] = content.trim();
          }
        } catch {
          // ignorer les lignes invalides
        }
      }
    }
  }

  const count = Object.keys(descriptions).length;
  writeFileSync(outputPath, JSON.stringify(descriptions, null, 0), "utf-8");

  console.log(`✓ ${count} descriptions exportées vers ${outputPath}`);
}

main();
