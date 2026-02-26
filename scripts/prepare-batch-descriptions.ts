/**
 * Génère les fichiers JSONL pour le batch Phase 2 (descriptions de lieux).
 *
 * Lit lieux-central.json, sélectionne le bon prompt par famille_type,
 * injecte les données techniques (rando/plage), et découpe en lots.
 *
 * Usage : npx tsx scripts/prepare-batch-descriptions.ts [--model gpt-4.1] [--split 8]
 *
 * Sortie : data/batch-desc/lot_1_ville.jsonl, lot_2_village-a.jsonl, ...
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const BATCH_DIR = join(DATA_DIR, "batch-desc");
const DB_PATH = join(DATA_DIR, "cities", "lieux-central.json");
const DOCS_DIR = join(process.cwd(), "docs");

const PROMPT_MAP: Record<string, string> = {
  ville: "prompt-ville-api.md",
  village: "prompt-lieu-simple-api.md",
  chateau: "prompt-chateau-api.md",
  abbaye: "prompt-abbaye-api.md",
  patrimoine: "prompt-patrimoine-api.md",
  site_naturel: "prompt-site-naturel-api.md",
  musee: "prompt-musee-api.md",
  plage: "prompt-plage-api.md",
  rando: "prompt-rando-api.md",
  autre: "prompt-autre-api.md",
};

interface LieuEntry {
  nom: string;
  famille_type?: string;
  type_plage?: string;
  familiale?: string;
  difficulte?: string;
  denivele_positif_m?: string;
  distance_km?: number | string;
  duree_estimee?: string;
  commune_depart?: string;
  commune?: string;
  [key: string]: unknown;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''\u2019]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildUserMessage(entry: LieuEntry, type: string): string {
  let msg = `Génère la fiche pour ${entry.nom}.`;

  if (type === "rando") {
    const parts: string[] = [];
    if (entry.distance_km) parts.push(`distance : ${entry.distance_km} km`);
    if (entry.denivele_positif_m) parts.push(`dénivelé positif : ${entry.denivele_positif_m}`);
    if (entry.duree_estimee) parts.push(`durée estimée : ${entry.duree_estimee}`);
    if (entry.difficulte) parts.push(`difficulté : ${entry.difficulte}`);
    if (entry.commune_depart) parts.push(`commune de départ : ${entry.commune_depart}`);
    if (parts.length) msg += `\n\nDonnées techniques :\n${parts.join("\n")}`;
  }

  if (type === "plage") {
    const parts: string[] = [];
    if (entry.type_plage) parts.push(`type : ${entry.type_plage}`);
    if (entry.familiale) parts.push(`familiale : ${entry.familiale}`);
    if (entry.commune) parts.push(`commune : ${entry.commune}`);
    if (parts.length) msg += `\n\nInformations :\n${parts.join("\n")}`;
  }

  return msg;
}

type LotDef = { id: string; label: string; entries: LieuEntry[] };

// OpenAI Batch API enqueued token limit (per org, gpt-4.1)
const ENQUEUED_TOKEN_LIMIT = 900_000;
const SAFETY_MARGIN = 0.92; // 8% buffer
const MAX_ENQUEUED = Math.floor(ENQUEUED_TOKEN_LIMIT * SAFETY_MARGIN);

function estimatePromptTokens(promptChars: number): number {
  return Math.ceil(promptChars / 3.5) + 30; // +30 for user message
}

function buildLots(allEntries: LieuEntry[], promptSizes: Map<string, number>): LotDef[] {
  const byType = new Map<string, LieuEntry[]>();
  for (const e of allEntries) {
    const t = e.famille_type || "autre";
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(e);
  }

  const lots: LotDef[] = [];
  const order = ["ville", "village", "rando", "plage", "chateau", "site_naturel", "patrimoine", "abbaye", "musee", "autre"];

  for (const type of order) {
    const entries = byType.get(type);
    if (!entries || entries.length === 0) continue;

    const sorted = [...entries].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const maxTokens = type === "ville" ? 4096 : 2048;
    const promptChars = promptSizes.get(type) ?? 10000;
    const tokensPerReq = estimatePromptTokens(promptChars) + maxTokens;
    const maxPerLot = Math.floor(MAX_ENQUEUED / tokensPerReq);
    const nbSublots = Math.ceil(sorted.length / maxPerLot);

    if (nbSublots <= 1) {
      lots.push({ id: type, label: `${type} (${sorted.length})`, entries: sorted });
    } else {
      const chunkSize = Math.ceil(sorted.length / nbSublots);
      for (let i = 0; i < nbSublots; i++) {
        const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
        const suffix = String.fromCharCode(97 + i); // a, b, c, d...
        lots.push({
          id: `${type}-${suffix}`,
          label: `${type} ${suffix.toUpperCase()} (${chunk.length}) [~${(chunk.length * tokensPerReq / 1000).toFixed(0)}K tok]`,
          entries: chunk,
        });
      }
    }
  }

  return lots;
}

function parseArgs(): { model: string } {
  let model = "gpt-4.1";
  const modelIdx = process.argv.indexOf("--model");
  if (modelIdx >= 0 && process.argv[modelIdx + 1]) {
    model = process.argv[modelIdx + 1];
  }
  return { model };
}

function main() {
  const { model } = parseArgs();

  if (!existsSync(DB_PATH)) {
    console.error(`❌ lieux-central.json introuvable : ${DB_PATH}`);
    process.exit(1);
  }

  const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const allEntries: LieuEntry[] = db.lieux || db;
  console.log(`Base : ${allEntries.length} lieux`);

  const promptCache = new Map<string, string>();
  function getPrompt(type: string): string {
    if (promptCache.has(type)) return promptCache.get(type)!;
    const file = PROMPT_MAP[type];
    if (!file) throw new Error(`Prompt inconnu pour type "${type}"`);
    const path = join(DOCS_DIR, file);
    if (!existsSync(path)) throw new Error(`Fichier prompt introuvable : ${path}`);
    const content = readFileSync(path, "utf-8");
    promptCache.set(type, content);
    return content;
  }

  // Pre-load prompt sizes for lot splitting
  const promptSizes = new Map<string, number>();
  for (const [type, file] of Object.entries(PROMPT_MAP)) {
    const p = join(DOCS_DIR, file);
    if (existsSync(p)) promptSizes.set(type, readFileSync(p, "utf-8").length);
  }

  const lots = buildLots(allEntries, promptSizes);
  mkdirSync(BATCH_DIR, { recursive: true });
  console.log(`Limite enqueued tokens : ${ENQUEUED_TOKEN_LIMIT.toLocaleString()} (marge ${Math.round((1 - SAFETY_MARGIN) * 100)}%)`);

  const manifest: Array<{ lot: number; id: string; label: string; file: string; requests: number }> = [];
  let totalRequests = 0;

  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    const type = lot.id.replace(/-[a-z]$/, "");
    const maxTokens = type === "ville" ? 4096 : 2048;
    const systemPrompt = getPrompt(type);

    const lines: string[] = [];

    for (const entry of lot.entries) {
      const slug = slugify(entry.nom);
      const userMsg = buildUserMessage(entry, type);

      const request = {
        custom_id: slug,
        method: "POST" as const,
        url: "/v1/chat/completions",
        body: {
          model,
          messages: [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        },
      };

      lines.push(JSON.stringify(request));
    }

    const filename = `lot_${i + 1}_${lot.id}.jsonl`;
    const filepath = join(BATCH_DIR, filename);
    writeFileSync(filepath, lines.join("\n"), "utf-8");

    manifest.push({
      lot: i + 1,
      id: lot.id,
      label: lot.label,
      file: filename,
      requests: lines.length,
    });
    totalRequests += lines.length;

    console.log(`✓ Lot ${i + 1} : ${filename} — ${lot.label} — ${lines.length} requêtes`);
  }

  writeFileSync(join(BATCH_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n═══════════════════════════════════`);
  console.log(`✓ ${manifest.length} lots préparés — ${totalRequests} requêtes au total`);
  console.log(`  Modèle : ${model}`);
  console.log(`  Dossier : ${BATCH_DIR}/`);
  console.log(`  Manifeste : manifest.json`);
  console.log(`\n  Soumettre via la page /batch-status ou :`);
  console.log(`    npx tsx scripts/submit-batch-desc.ts 1`);
}

main();
