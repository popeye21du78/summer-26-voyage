/**
 * Appelle l'API OpenAI pour générer une fiche lieu brute.
 *
 * Usage: npx tsx scripts/generate-ville-fiche.ts <Lieu> [modele] [--type <famille>]
 *
 *   --type <famille>  Famille du lieu. Valeurs possibles :
 *       ville        (défaut) Prompt Top 100
 *       village      Prompt lieu simple (villages & villes secondaires)
 *       chateau      Prompt château
 *       abbaye       Prompt abbaye & monastère
 *       patrimoine   Prompt patrimoine (chapelles, citadelles, ponts…)
 *       site_naturel Prompt site naturel
 *       musee        Prompt musée
 *       plage        Prompt plage
 *       rando        Prompt randonnée (injecte données techniques depuis la DB)
 *       autre        Prompt lieu divers
 *
 *   --simple  Alias pour --type village
 *
 * Ex:  npx tsx scripts/generate-ville-fiche.ts Marseille gpt-4.1
 *      npx tsx scripts/generate-ville-fiche.ts "Collonges-la-Rouge" --type village
 *      npx tsx scripts/generate-ville-fiche.ts "Le Puy de Montoncel" --type rando
 *
 * Sortie: data/test-adaptation/<lieu>-raw.txt
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

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

function findLieuInDB(nom: string): LieuEntry | undefined {
  const dbPath = join(process.cwd(), "data", "cities", "lieux-central.json");
  if (!existsSync(dbPath)) return undefined;
  const db = JSON.parse(readFileSync(dbPath, "utf-8"));
  const lieux: LieuEntry[] = db.lieux || db;
  const normalized = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return lieux.find((l) => {
    const n = (l.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === normalized;
  });
}

function buildUserMessage(nom: string, type: string, entry?: LieuEntry): string {
  let msg = `Génère la fiche pour ${nom}.`;

  if (type === "rando" && entry) {
    const parts: string[] = [];
    if (entry.distance_km) parts.push(`distance : ${entry.distance_km} km`);
    if (entry.denivele_positif_m) parts.push(`dénivelé positif : ${entry.denivele_positif_m}`);
    if (entry.duree_estimee) parts.push(`durée estimée : ${entry.duree_estimee}`);
    if (entry.difficulte) parts.push(`difficulté : ${entry.difficulte}`);
    if (entry.commune_depart) parts.push(`commune de départ : ${entry.commune_depart}`);
    if (parts.length) {
      msg += `\n\nDonnées techniques :\n${parts.join("\n")}`;
    }
  }

  if (type === "plage" && entry) {
    const parts: string[] = [];
    if (entry.type_plage) parts.push(`type : ${entry.type_plage}`);
    if (entry.familiale) parts.push(`familiale : ${entry.familiale}`);
    if (entry.commune) parts.push(`commune : ${entry.commune}`);
    if (parts.length) {
      msg += `\n\nInformations :\n${parts.join("\n")}`;
    }
  }

  return msg;
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);

  let type = "ville";
  const typeIdx = args.indexOf("--type");
  if (typeIdx >= 0 && args[typeIdx + 1]) {
    type = args[typeIdx + 1];
    args.splice(typeIdx, 2);
  } else if (args.includes("--simple")) {
    type = "village";
    args.splice(args.indexOf("--simple"), 1);
  }

  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  const nom = positionalArgs[0];
  const model = positionalArgs[1] ?? "gpt-4.1";

  if (!nom) {
    console.error("Usage: npx tsx scripts/generate-ville-fiche.ts <Lieu> [modele] [--type <famille>]");
    process.exit(1);
  }

  if (!PROMPT_MAP[type]) {
    console.error(`Type inconnu : "${type}". Valeurs possibles : ${Object.keys(PROMPT_MAP).join(", ")}`);
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY manquante dans .env.local");
    process.exit(1);
  }

  const promptFile = PROMPT_MAP[type];
  const promptPath = join(process.cwd(), "docs", promptFile);
  const systemPrompt = readFileSync(promptPath, "utf-8");

  const entry = (type === "rando" || type === "plage") ? findLieuInDB(nom) : undefined;
  if ((type === "rando" || type === "plage") && !entry) {
    console.warn(`⚠ Entrée "${nom}" non trouvée dans lieux-central.json — pas de données techniques injectées.`);
  }

  const userMessage = buildUserMessage(nom, type, entry);
  const maxTokens = type === "ville" ? 4096 : 2048;

  console.log(`→ Appel API ${model} pour "${nom}" (type: ${type})…`);
  if (entry && type === "rando") {
    console.log(`  Données DB injectées : ${entry.distance_km} km, D+ ${entry.denivele_positif_m}, ${entry.duree_estimee}, ${entry.difficulte}`);
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  const output = response.choices[0]?.message?.content ?? "";
  const tokens = response.usage;

  if (!output.trim()) {
    console.error("Réponse vide de l'API.");
    process.exit(1);
  }

  const outDir = join(process.cwd(), "data", "test-adaptation");
  mkdirSync(outDir, { recursive: true });
  const slug = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  const outPath = join(outDir, `${slug}-raw.txt`);
  writeFileSync(outPath, output, "utf-8");

  console.log(`✓ Fichier brut : ${outPath}`);
  if (tokens) {
    console.log(`  Tokens — prompt: ${tokens.prompt_tokens}, completion: ${tokens.completion_tokens}, total: ${tokens.total_tokens}`);
  }

  console.log(`\nPour valider et corriger :`);
  console.log(`  npx tsx scripts/validate-and-fix-raw.ts data/test-adaptation/${slug}-raw.txt "${nom}"`);
  console.log(`\nPour tester l'adaptation :`);
  console.log(`  npx tsx scripts/test-adaptation-ville.ts data/test-adaptation/${slug}-raw.txt "${nom}"`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
