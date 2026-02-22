/**
 * Parse la sortie brute de l'API (fiche ville avec délimiteurs ---ID---)
 * et produit un fichier .md lisible, ouvrable dans Word.
 *
 * Usage: npx tsx scripts/api-response-to-word.ts <fichier-reponse.txt> [ville]
 * Exemple: npx tsx scripts/api-response-to-word.ts reponse-toulouse.txt Toulouse
 *
 * Sortie: <fichier-reponse>-lisible.md (ou fiche-<ville>-lisible.md)
 */

import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";

const SECTION_LABELS: Record<string, string> = {
  PRESENTATION: "Présentation",
  HISTOIRE_BASES: "Histoire (bases)",
  HISTOIRE_APPROFONDI: "Histoire (approfondi)",
  QUE_FAIRE_CONNU: "Que faire ? (connu)",
  QUE_FAIRE_INCONNU: "Que faire ? (inconnu)",
  MANGER_INTIME_SERRE: "Où manger — Intime, budget serré",
  MANGER_INTIME_LARGE: "Où manger — Intime, budget large",
  MANGER_ANIME_SERRE: "Où manger — Animé, budget serré",
  MANGER_ANIME_LARGE: "Où manger — Animé, budget large",
  BONUS_COUPLE: "Bonus — En couple",
  BONUS_SEUL: "Bonus — Seul",
  BONUS_FAMILLE: "Bonus — En famille",
  BONUS_AMIS: "Bonus — Entre amis",
};

const DELIMITER_REGEX = /---([A-Z_]+)---/g;

function parseSections(raw: string): Map<string, string> {
  const sections = new Map<string, string>();
  const parts = raw.split(DELIMITER_REGEX);

  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const content = (parts[i + 1] ?? "").trim();
    if (id) sections.set(id, content);
  }

  return sections;
}

function toReadableMarkdown(sections: Map<string, string>): string {
  const lines: string[] = [];
  const order = Object.keys(SECTION_LABELS);

  for (const id of order) {
    const label = SECTION_LABELS[id];
    const content = sections.get(id);
    if (label) {
      lines.push(`## ${label}\n`);
      lines.push(content ?? "(vide)");
      lines.push("\n");
    }
  }

  return lines.join("\n").trimEnd();
}

function main() {
  const inputPath = process.argv[2];
  const ville = process.argv[3];

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/api-response-to-word.ts <fichier-reponse.txt> [ville]");
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf-8");
  const sections = parseSections(raw);
  const md = toReadableMarkdown(sections);

  const base = basename(inputPath).replace(/\.[^.]+$/, "");
  const outName = ville
    ? `fiche-${ville}-lisible.md`
    : `${base.replace(/-raw|-reponse$/, "")}-lisible.md`;
  const outPath = join(dirname(inputPath), outName);

  writeFileSync(outPath, md, "utf-8");
  console.log(`Fichier lisible généré : ${outPath}`);
}

main();
