/**
 * Génération de contenu via OpenAI pour la page ville.
 * Modèle et prompts définis dans lib/city-prompts.ts
 */

import OpenAI from "openai";
import {
  OPENAI_MODEL,
  SYSTEM_PROMPT,
  DIAGNOSTIC_PROMPT,
  SECTION_PROMPTS,
  type SectionType,
} from "./city-prompts";
import { getCityDiagnostic, upsertCitySection } from "./city-sections-supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NIVEAU_LABELS: Record<number, string> = {
  1: "Désert",
  2: "Escale",
  3: "Pépite",
  4: "Métropole",
};

/** Détermine le niveau du lieu (1-4). Cache en DB. */
export async function runDiagnostic(ville: string, stepId: string): Promise<number> {
  const cached = await getCityDiagnostic(stepId);
  if (cached != null) return cached;

  const prompt = DIAGNOSTIC_PROMPT.replace("[VILLE]", ville);
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 10,
  });

  const text = res.choices[0]?.message?.content?.trim() ?? "2";
  const num = parseInt(text.replace(/\D/g, ""), 10);
  const level = Math.min(4, Math.max(1, num || 2));

  await upsertCitySection(stepId, "diagnostic", String(level), level);
  return level;
}

/** Génère le contenu d'une section. */
export async function generateSection(
  ville: string,
  stepId: string,
  sectionType: SectionType
): Promise<{ content: string; placeRating: number }> {
  const level = await runDiagnostic(ville, stepId);
  const niveauLabel = NIVEAU_LABELS[level] ?? "Escale";

  const template = SECTION_PROMPTS[sectionType];
  const userPrompt = template
    .replace(/\[VILLE\]/g, ville)
    .replace(/\[NIVEAU\]/g, `${level} (${niveauLabel})`);

  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2000,
  });

  const content = res.choices[0]?.message?.content?.trim() ?? "";

  await upsertCitySection(stepId, sectionType, content, level);

  return { content, placeRating: level };
}

/** Génère le contenu en stream (pour affichage progressif). Yield les deltas, sauvegarde en DB à la fin. */
export async function* generateSectionStream(
  ville: string,
  stepId: string,
  sectionType: SectionType
): AsyncGenerator<string> {
  const level = await runDiagnostic(ville, stepId);
  const niveauLabel = NIVEAU_LABELS[level] ?? "Escale";

  const template = SECTION_PROMPTS[sectionType];
  const userPrompt = template
    .replace(/\[VILLE\]/g, ville)
    .replace(/\[NIVEAU\]/g, `${level} (${niveauLabel})`);

  const stream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2000,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    fullContent += text;
    if (text) yield text;
  }
  const content = fullContent.trim();
  await upsertCitySection(stepId, sectionType, content, level);
}
