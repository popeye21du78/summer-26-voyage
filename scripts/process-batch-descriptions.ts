/**
 * Éclate les résultats du batch Phase 2 en fichiers -raw.txt individuels,
 * puis lance la validation/auto-fix sur chaque fichier.
 *
 * Usage :
 *   npx tsx scripts/process-batch-descriptions.ts <lot-number|all>
 *   npx tsx scripts/process-batch-descriptions.ts all --validate
 *
 * Options :
 *   --validate  Lance validate-and-fix-raw.ts sur chaque fichier éclaté
 *   --photos    Lance create-photo-folders.ts après validation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");
const OUTPUT_DIR = join(process.cwd(), "data", "descriptions");
const PROGRESS_PATH = join(BATCH_DIR, ".process-desc-progress.json");

interface ManifestEntry {
  lot: number;
  id: string;
  label: string;
  file: string;
  requests: number;
}

interface BatchResultLine {
  custom_id: string;
  response?: {
    status_code: number;
    body?: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
  };
  error?: { message: string };
}

function writeProgress(data: Record<string, unknown>) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function clearProgress() {
  if (existsSync(PROGRESS_PATH)) {
    writeFileSync(PROGRESS_PATH, "", "utf-8");
  }
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const doValidate = process.argv.includes("--validate");
  const doPhotos = process.argv.includes("--photos");
  const lotArg = args[0];

  if (!lotArg) {
    console.error("Usage: npx tsx scripts/process-batch-descriptions.ts <lot|all> [--validate] [--photos]");
    process.exit(1);
  }

  const manifestPath = join(BATCH_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("❌ manifest.json introuvable");
    process.exit(1);
  }
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const lotsToProcess: number[] = [];
  if (lotArg === "all") {
    for (const m of manifest) {
      if (existsSync(join(BATCH_DIR, `batch_output_lot${m.lot}.jsonl`))) {
        lotsToProcess.push(m.lot);
      }
    }
  } else {
    lotsToProcess.push(parseInt(lotArg, 10));
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalWritten = 0;
  let totalErrors = 0;
  let totalTokens = { prompt: 0, completion: 0 };

  for (const lotNum of lotsToProcess) {
    const outputFile = join(BATCH_DIR, `batch_output_lot${lotNum}.jsonl`);
    if (!existsSync(outputFile)) {
      console.warn(`⚠ batch_output_lot${lotNum}.jsonl introuvable — lot ${lotNum} ignoré`);
      continue;
    }

    const mEntry = manifest.find((m) => m.lot === lotNum);
    console.log(`\n── Lot ${lotNum} : ${mEntry?.label ?? "?"} ──`);

    const lines = readFileSync(outputFile, "utf-8").trim().split("\n").filter(Boolean);
    let written = 0;
    let errors = 0;

    for (const line of lines) {
      const result: BatchResultLine = JSON.parse(line);
      const slug = result.custom_id;

      if (result.error) {
        console.error(`  ✗ ${slug} : ${result.error.message}`);
        errors++;
        continue;
      }

      const content = result.response?.body?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        console.error(`  ✗ ${slug} : réponse vide`);
        errors++;
        continue;
      }

      const usage = result.response?.body?.usage;
      if (usage) {
        totalTokens.prompt += usage.prompt_tokens;
        totalTokens.completion += usage.completion_tokens;
      }

      const outPath = join(OUTPUT_DIR, `${slug}-raw.txt`);
      writeFileSync(outPath, content, "utf-8");
      written++;
    }

    console.log(`  ✓ ${written} fichiers écrits, ${errors} erreurs`);
    totalWritten += written;
    totalErrors += errors;

    writeProgress({
      phase: "eclate",
      lotNum,
      totalLots: lotsToProcess.length,
      written: totalWritten,
      errors: totalErrors,
    });
  }

  const costInput = (totalTokens.prompt / 1_000_000) * 2.0;
  const costOutput = (totalTokens.completion / 1_000_000) * 8.0;
  const costBatch = (costInput + costOutput) * 0.5;

  console.log(`\n═══════════════════════════════════`);
  console.log(`✓ ${totalWritten} descriptions éclatées, ${totalErrors} erreurs`);
  console.log(`  Tokens : ${totalTokens.prompt.toLocaleString()} input + ${totalTokens.completion.toLocaleString()} output`);
  console.log(`  Coût batch estimé : ~$${costBatch.toFixed(2)} (tarif gpt-4.1 batch -50%)`);
  console.log(`  Dossier : ${OUTPUT_DIR}/`);

  if (doValidate) {
    console.log(`\n── Validation + auto-fix ──`);
    const rawFiles = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith("-raw.txt"));
    let validated = 0;
    let fixErrors = 0;

    for (const f of rawFiles) {
      const filePath = join(OUTPUT_DIR, f);
      try {
        writeProgress({
          phase: "validate",
          current: validated + 1,
          total: rawFiles.length,
          currentFile: f,
        });
        execSync(`npx tsx scripts/validate-and-fix-raw.ts "${filePath}"`, {
          cwd: process.cwd(),
          stdio: "pipe",
          timeout: 120_000,
        });
        validated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ✗ ${f} : ${msg.slice(0, 120)}`);
        fixErrors++;
      }
    }
    console.log(`  ✓ ${validated} validés, ${fixErrors} erreurs`);
  }

  if (doPhotos) {
    console.log(`\n── Création dossiers photos ──`);
    try {
      execSync(`npx tsx scripts/create-photo-folders.ts "${OUTPUT_DIR}"`, {
        cwd: process.cwd(),
        stdio: "inherit",
        timeout: 120_000,
      });
    } catch (e) {
      console.error("Erreur photos :", e instanceof Error ? e.message : String(e));
    }
  }

  clearProgress();
}

main();
