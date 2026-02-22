/**
 * Télécharge les résultats du batch Phase 1.
 * Usage : npx tsx scripts/download-batch-results.ts [1|2|3|4|all]
 * - Avec numéro : télécharge ce lot uniquement
 * - Sans arg ou "all" : télécharge tous les lots complétés et fusionne en batch_output.jsonl
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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
const OUTPUT_PATH = join(BATCH_DIR, "batch_output.jsonl");

async function downloadOne(openai: OpenAI, batchId: string): Promise<string> {
  const batch = await openai.batches.retrieve(batchId);
  if (batch.status !== "completed") {
    throw new Error(`Lot non terminé (statut: ${batch.status})`);
  }
  if (!batch.output_file_id) throw new Error("Pas de fichier de sortie");
  const response = await openai.files.content(batch.output_file_id);
  return response.text();
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY manquant");
    process.exit(1);
  }

  const arg = process.argv[2];
  const openai = new OpenAI({ apiKey });
  mkdirSync(BATCH_DIR, { recursive: true });

  if (arg && arg !== "all") {
    const part = parseInt(arg, 10);
    if (Number.isNaN(part) || part < 1) {
      console.error("Usage: npx tsx scripts/download-batch-results.ts [1|2|3|4|all]");
      process.exit(1);
    }
    const idPath = join(BATCH_DIR, `batch_id_part${part}.txt`);
    if (!existsSync(idPath)) {
      console.error(`❌ batch_id_part${part}.txt introuvable`);
      process.exit(1);
    }
    const batchId = readFileSync(idPath, "utf-8").trim();
    const content = await downloadOne(openai, batchId);
    const outPath = join(BATCH_DIR, `batch_output_part${part}.jsonl`);
    writeFileSync(outPath, content, "utf-8");
    console.log(`✓ Lot ${part} : ${outPath}`);
    return;
  }

  const allLines: string[] = [];
  for (let p = 1; p <= 4; p++) {
    const idPath = join(BATCH_DIR, `batch_id_part${p}.txt`);
    if (!existsSync(idPath)) continue;
    const batchId = readFileSync(idPath, "utf-8").trim();
    try {
      const content = await downloadOne(openai, batchId);
      const lines = content.trim().split("\n").filter(Boolean);
      allLines.push(...lines);
      console.log(`✓ Lot ${p} : ${lines.length} réponses`);
    } catch (e) {
      console.warn(`⚠ Lot ${p} : ${(e as Error).message}`);
    }
  }

  if (allLines.length === 0) {
    console.error("❌ Aucun lot complété téléchargé");
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, allLines.join("\n"), "utf-8");
  console.log(`\n✓ Fusionné : ${OUTPUT_PATH} (${allLines.length} réponses)`);
  console.log(`  Étape suivante : npx tsx scripts/process-batch-results.ts`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
