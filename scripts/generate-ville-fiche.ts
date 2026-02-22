/**
 * Appelle l'API OpenAI pour générer une fiche ville brute.
 *
 * Usage: npx tsx scripts/generate-ville-fiche.ts <Ville> [noteEsthetique] [modele]
 * Ex:    npx tsx scripts/generate-ville-fiche.ts Marseille 10 gpt-4.1
 *
 * Sortie: data/test-adaptation/<ville>-raw.txt
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
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

async function main() {
  loadEnvLocal();

  const ville = process.argv[2];
  const note = process.argv[3] ?? "8";
  const model = process.argv[4] ?? "gpt-4.1";

  if (!ville) {
    console.error("Usage: npx tsx scripts/generate-ville-fiche.ts <Ville> [noteEsthetique] [modele]");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY manquante dans .env.local");
    process.exit(1);
  }

  const promptPath = join(process.cwd(), "docs", "prompt-ville-api.md");
  const systemPrompt = readFileSync(promptPath, "utf-8");

  const userMessage = `Génère la fiche pour ${ville}. Note esthétique : ${note}/10.`;

  console.log(`→ Appel API ${model} pour "${ville}" (note ${note}/10)…`);

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const output = response.choices[0]?.message?.content ?? "";
  const tokens = response.usage;

  if (!output.trim()) {
    console.error("Réponse vide de l'API.");
    process.exit(1);
  }

  const outDir = join(process.cwd(), "data", "test-adaptation");
  mkdirSync(outDir, { recursive: true });
  const slug = ville.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  const outPath = join(outDir, `${slug}-raw.txt`);
  writeFileSync(outPath, output, "utf-8");

  console.log(`✓ Fichier brut : ${outPath}`);
  if (tokens) {
    console.log(`  Tokens — prompt: ${tokens.prompt_tokens}, completion: ${tokens.completion_tokens}, total: ${tokens.total_tokens}`);
  }
  console.log(`\nPour tester l'adaptation :`);
  console.log(`  npx tsx scripts/test-adaptation-ville.ts data/test-adaptation/${slug}-raw.txt ${ville}`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
