/**
 * Vérifie le statut d'un lot du batch Phase 1.
 * Usage : npx tsx scripts/check-batch-status.ts [1|2|3|4]
 * Sans argument : affiche le statut de tous les lots ayant un batch_id.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && value) process.env[key] = value;
      }
    }
  });
}
loadEnvLocal();

const BATCH_DIR = join(process.cwd(), "data", "batch");

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY manquant");
    process.exit(1);
  }

  const partArg = process.argv[2];
  const partsToCheck: number[] = partArg
    ? [parseInt(partArg, 10)].filter((n) => !Number.isNaN(n) && n >= 1)
    : [1, 2, 3, 4].filter((p) => existsSync(join(BATCH_DIR, `batch_id_part${p}.txt`)));

  if (partsToCheck.length === 0) {
    console.error("❌ Aucun batch_id trouvé. Lance submit-batch.ts 1 d'abord.");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  for (const part of partsToCheck) {
    const path = join(BATCH_DIR, `batch_id_part${part}.txt`);
    if (!existsSync(path)) continue;
    const batchId = readFileSync(path, "utf-8").trim();
    const batch = await openai.batches.retrieve(batchId);
    console.log(`\n--- Lot ${part} ---`);
    console.log(`  ID: ${batch.id}`);
    console.log(`  Statut: ${batch.status}`);
    if (batch.request_counts) {
      console.log(`  Requêtes: ${batch.request_counts.completed}/${batch.request_counts.total} complétées`);
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
