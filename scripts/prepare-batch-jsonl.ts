/**
 * Génère les fichiers JSONL pour le batch Phase 1 (patrimoine + plages).
 * Découpage en N lots pour respecter la limite d'enqueued tokens (90k pour gpt-4o).
 *
 * Usage : npx tsx scripts/prepare-batch-jsonl.ts [--split 4]
 * Sortie : data/batch/batch_part1.jsonl, batch_part2.jsonl, ...
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getPromptPasse2 } from "./prompt-passe2";
import { TIER_EFFECTIFS } from "../data/departements/tier-effectifs";
import { getContexteDepartement } from "../lib/profils-departement";

const DATA_DIR = join(process.cwd(), "data");
const BATCH_DIR = join(DATA_DIR, "batch");
const PBVF_PATH = join(DATA_DIR, "plus-beaux-villages.json");

const DEFAULT_SPLIT = 4; // ~24 départements par lot, reste sous 90k tokens

type PbvfEntry = { nom: string; code_insee: string | null };

function loadPbvfForDepartment(codeDep: string): string[] {
  try {
    if (!existsSync(PBVF_PATH)) return [];
    let raw = readFileSync(PBVF_PATH, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const list = JSON.parse(raw) as PbvfEntry[];
    return list
      .filter((v) => {
        if (!v.code_insee) return false;
        const depCode = v.code_insee.startsWith("97")
          ? v.code_insee.slice(0, 3)
          : v.code_insee.slice(0, 2);
        return depCode === codeDep;
      })
      .map((v) => v.nom);
  } catch {
    return [];
  }
}

function parseArgs(): { split: number } {
  const splitArg = process.argv.find((a) => a.startsWith("--split="));
  const split = splitArg ? parseInt(splitArg.split("=")[1], 10) : DEFAULT_SPLIT;
  return { split: Number.isNaN(split) || split < 1 ? DEFAULT_SPLIT : split };
}

function main() {
  const { split } = parseArgs();

  const classementPath = join(DATA_DIR, "departements", "classement.json");
  if (!existsSync(classementPath)) {
    console.error("❌ classement.json introuvable:", classementPath);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(classementPath, "utf-8")) as {
    classement?: Array<{ code: string; departement: string; tier: string }>;
  };
  const classement = data.classement ?? [];

  const nbPatrimoineByTier: Record<string, number> = {};
  const nbPepitesMinByTier: Record<string, number> = {};
  for (const k of Object.keys(TIER_EFFECTIFS) as Array<keyof typeof TIER_EFFECTIFS>) {
    nbPatrimoineByTier[k] = TIER_EFFECTIFS[k].patrimoine;
    nbPepitesMinByTier[k] = TIER_EFFECTIFS[k].pepites_min;
  }

  const lines: string[] = [];

  for (const entry of classement) {
    const codeDep = String(entry.code);

    const ctx = getContexteDepartement(codeDep, nbPatrimoineByTier, nbPepitesMinByTier);
    if (!ctx) {
      console.warn(`   ⚠ Contexte manquant pour ${codeDep}, ignoré`);
      continue;
    }

    const pbvfDep = loadPbvfForDepartment(codeDep);
    const nbGptComplement = Math.max(0, ctx.nbPatrimoine - pbvfDep.length);
    const prompt = getPromptPasse2(ctx, pbvfDep, nbGptComplement);

    const request = {
      custom_id: codeDep,
      method: "POST" as const,
      url: "/v1/chat/completions",
      body: {
        model: "gpt-4o",
        messages: [{ role: "user" as const, content: prompt }],
        response_format: { type: "json_object" as const },
        max_tokens: 16000,
      },
    };

    lines.push(JSON.stringify(request));
  }

  mkdirSync(BATCH_DIR, { recursive: true });

  const chunkSize = Math.ceil(lines.length / split);
  const parts: string[][] = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    parts.push(lines.slice(i, i + chunkSize));
  }

  for (let p = 0; p < parts.length; p++) {
    const path = join(BATCH_DIR, `batch_part${p + 1}.jsonl`);
    writeFileSync(path, parts[p].join("\n"), "utf-8");
    console.log(`✓ Partie ${p + 1} : ${path} (${parts[p].length} requêtes)`);
  }

  console.log(`\n  Total : ${lines.length} requêtes en ${parts.length} lots`);
  console.log(`  Soumettre les lots UN PAR UN (attendre "completed" avant le suivant)`);
}

main();
