/**
 * Soumet un lot du batch Phase 1 à l'API OpenAI.
 * Usage : npx tsx scripts/submit-batch.ts [1|2|3|4]
 * Lot 1 = batch_part1.jsonl, etc.
 * Soumettre UN lot à la fois. Attendre "completed" avant le suivant.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, createReadStream } from "fs";
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

function getPartNumber(): number {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npx tsx scripts/submit-batch.ts <1|2|3|4>");
    console.error("  Lance d'abord: npx tsx scripts/prepare-batch-jsonl.ts --split=4");
    process.exit(1);
  }
  const n = parseInt(arg, 10);
  if (Number.isNaN(n) || n < 1) {
    console.error("Le numéro de lot doit être 1, 2, 3 ou 4");
    process.exit(1);
  }
  return n;
}

async function main() {
  const part = getPartNumber();
  const INPUT_PATH = join(BATCH_DIR, `batch_part${part}.jsonl`);
  const BATCH_ID_PATH = join(BATCH_DIR, `batch_id_part${part}.txt`);
  const BATCH_META_PATH = join(BATCH_DIR, `batch_meta_part${part}.json`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY manquant dans .env.local");
    process.exit(1);
  }

  if (!existsSync(INPUT_PATH)) {
    console.error(`❌ Fichier introuvable: ${INPUT_PATH}`);
    console.error("  Lance d'abord: npx tsx scripts/prepare-batch-jsonl.ts --split=4");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log(`>> Upload du lot ${part}...`);
  const file = await openai.files.create({
    file: createReadStream(INPUT_PATH),
    purpose: "batch",
  });
  console.log(`   File ID: ${file.id}`);

  console.log(`>> Création du batch (lot ${part})...`);
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
    metadata: { description: `Phase 1 lot ${part}/4`, part: String(part) },
  });

  console.log(`\n✓ Batch lot ${part} créé : ${batch.id}`);
  console.log(`  Statut : ${batch.status}`);
  console.log(`  Délai : ~24 h. Surveille sur https://platform.openai.com/batches`);
  console.log(`  Quand "completed", lance: npx tsx scripts/download-batch-results.ts ${part}`);
  if (part < 4) {
    console.log(`  Puis soumets le lot suivant: npx tsx scripts/submit-batch.ts ${part + 1}\n`);
  }

  mkdirSync(BATCH_DIR, { recursive: true });
  writeFileSync(BATCH_ID_PATH, batch.id, "utf-8");
  writeFileSync(
    BATCH_META_PATH,
    JSON.stringify(
      { batch_id: batch.id, part, input_file_id: file.id, created_at: batch.created_at, status: batch.status },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`  batch_id sauvegardé dans ${BATCH_ID_PATH}`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
