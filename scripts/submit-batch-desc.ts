/**
 * Soumet un lot du batch Phase 2 (descriptions) à l'API OpenAI.
 * Usage : npx tsx scripts/submit-batch-desc.ts <numéro-lot>
 *
 * Lit le manifest.json pour trouver le fichier JSONL correspondant.
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
        if (key && value && !process.env[key]) process.env[key] = value;
      }
    }
  });
}
loadEnvLocal();

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");

interface ManifestEntry {
  lot: number;
  id: string;
  label: string;
  file: string;
  requests: number;
}

function loadManifest(): ManifestEntry[] {
  const path = join(BATCH_DIR, "manifest.json");
  if (!existsSync(path)) {
    console.error("❌ manifest.json introuvable. Lance d'abord :");
    console.error("   npx tsx scripts/prepare-batch-descriptions.ts");
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function main() {
  const lotNum = parseInt(process.argv[2], 10);
  if (Number.isNaN(lotNum) || lotNum < 1) {
    console.error("Usage: npx tsx scripts/submit-batch-desc.ts <numéro-lot>");
    process.exit(1);
  }

  const manifest = loadManifest();
  const entry = manifest.find((m) => m.lot === lotNum);
  if (!entry) {
    console.error(`❌ Lot ${lotNum} introuvable dans le manifeste (lots : 1–${manifest.length})`);
    process.exit(1);
  }

  const inputPath = join(BATCH_DIR, entry.file);
  if (!existsSync(inputPath)) {
    console.error(`❌ Fichier introuvable : ${inputPath}`);
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY manquant dans .env.local");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log(`>> Upload lot ${lotNum} (${entry.label}) — ${entry.requests} requêtes…`);
  const file = await openai.files.create({
    file: createReadStream(inputPath),
    purpose: "batch",
  });
  console.log(`   File ID: ${file.id}`);

  console.log(`>> Création du batch…`);
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
    metadata: {
      description: `Phase 2 descriptions — ${entry.label}`,
      lot: String(lotNum),
      id: entry.id,
    },
  });

  console.log(`\n✓ Batch lot ${lotNum} créé : ${batch.id}`);
  console.log(`  Statut : ${batch.status}`);
  console.log(`  Délai : ~24 h max`);

  mkdirSync(BATCH_DIR, { recursive: true });
  writeFileSync(join(BATCH_DIR, `batch_id_lot${lotNum}.txt`), batch.id, "utf-8");
  writeFileSync(
    join(BATCH_DIR, `batch_meta_lot${lotNum}.json`),
    JSON.stringify(
      {
        batch_id: batch.id,
        lot: lotNum,
        id: entry.id,
        label: entry.label,
        input_file_id: file.id,
        requests: entry.requests,
        created_at: batch.created_at,
        status: batch.status,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`  batch_id sauvegardé dans batch_id_lot${lotNum}.txt`);

  if (lotNum < manifest.length) {
    console.log(`\n  Quand terminé, lance le suivant :`);
    console.log(`    npx tsx scripts/submit-batch-desc.ts ${lotNum + 1}`);
  }
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
