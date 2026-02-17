/**
 * Passe 1 : classification des 96 départements métropolitains en tiers d'attractivité.
 * Sortie : data/departements/classement.json (réutilisable dans le prompt de la Passe 2).
 *
 * Usage : npx tsx scripts/classify-departements.ts
 * Prérequis : OPENAI_API_KEY dans .env.local
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

// Charger .env.local
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

const PROMPT_CLASSIFICATION = `Tu es un expert en patrimoine et tourisme français. Classe les 96 départements métropolitains en 5 tiers d'attractivité patrimoniale et paysagère, sur une échelle NATIONALE ABSOLUE.

Critères de classement :
- Densité de sites patrimoniaux remarquables (villages classés, PBVF, Villes d'Art et d'Histoire, monuments majeurs)
- Diversité paysagère (mer, montagne, gorges, campagne remarquable)
- Attractivité touristique patrimoniale (pas industrielle ou balnéaire de masse)

Tiers :
- S : Exceptionnel (top 10 national). Concentration unique de patrimoine. Exemples indicatifs : Dordogne, Lot, Vaucluse.
- A : Très riche (top 25). Patrimoine dense et varié.
- B : Riche. Beau patrimoine mais moins dense ou moins divers.
- C : Correct. Quelques sites remarquables mais territoire moins touristique.
- D : Pauvre en patrimoine bâti remarquable (départements très urbains, industriels ou sans identité forte).

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après. Format exact :
{
  "classement": [
    {"code": "24", "departement": "Dordogne", "tier": "S"},
    {"code": "93", "departement": "Seine-Saint-Denis", "tier": "D"}
  ]
}

Classe les 96 départements métropolitains : codes 01 à 19, 21 à 95, 2A (Corse-du-Sud), 2B (Haute-Corse). Ordre des entrées : par code département (01, 02, ..., 2A, 2B, ..., 95).`;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY manquant. Ajoute-la dans .env.local");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log("Appel API OpenAI (GPT-4o) pour classification des 96 départements...");
  const start = Date.now();

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: PROMPT_CLASSIFICATION }],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const content = res.choices[0]?.message?.content;
  const usage = res.usage;

  if (!content) {
    console.error("Réponse API vide");
    process.exit(1);
  }

  let data: { classement: Array<{ code: string; departement: string; tier: string }> };
  try {
    data = JSON.parse(content) as typeof data;
  } catch (e) {
    console.error("Réponse JSON invalide:", content.slice(0, 200));
    process.exit(1);
  }

  if (!Array.isArray(data.classement) || data.classement.length === 0) {
    console.error("Format attendu : { classement: [...] }");
    process.exit(1);
  }

  const outDir = join(process.cwd(), "data", "departements");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "classement.json");

  const output = {
    generatedAt: new Date().toISOString(),
    usage: usage
      ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.total_tokens }
      : null,
    classement: data.classement,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Terminé en ${elapsed}s.`);
  if (usage) {
    console.log(`Tokens: ${usage.prompt_tokens} entrée, ${usage.completion_tokens} sortie, ${usage.total_tokens} total.`);
  }
  console.log(`Écrit: ${outPath}`);
  console.log(`Départements classés: ${data.classement.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
