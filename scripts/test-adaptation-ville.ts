/**
 * Génère les textes adaptés pour N profils utilisateur à partir d'une sortie API brute,
 * et produit un document Word (.doc) regroupant toutes les versions.
 *
 * Usage: npx tsx scripts/test-adaptation-ville.ts <fichier-raw.txt> [nom-ville]
 * Ex:    npx tsx scripts/test-adaptation-ville.ts data/test-adaptation/colmar-raw.txt Colmar
 *
 * Sortie: data/test-adaptation/output/<ville>-<profil>.md  (1 par profil)
 *         data/test-adaptation/output/<ville>-profils.doc   (Word, toutes les versions)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { basename, join } from "path";
import {
  parseAndAdaptRawResponse,
  type ProfilVille,
} from "../lib/ville-adaptation";

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
  BONUS_SEUL: "Bonus — Seul·e",
  BONUS_FAMILLE: "Bonus — En famille",
  BONUS_AMIS: "Bonus — Entre amis",
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

const PROFILS: { nom: string; slug: string; profil: ProfilVille }[] = [
  {
    nom: "Marc (homme, seul)",
    slug: "marc",
    profil: {
      genre: "homme",
      typePartenaire: "seul",
      prenom: "Marc",
    },
  },
  {
    nom: "Annie (femme, seule)",
    slug: "annie",
    profil: {
      genre: "femme",
      typePartenaire: "seul",
      prenom: "Annie",
    },
  },
  {
    nom: "André (homme, avec amis Léo et Jean)",
    slug: "andre",
    profil: {
      genre: "homme",
      typePartenaire: "amis",
      prenom: "André",
      pluriel: true,
      amis: ["Léo", "Jean"],
    },
  },
  {
    nom: "Adeline (femme, couple avec Joris)",
    slug: "adeline",
    profil: {
      genre: "femme",
      typePartenaire: "couple",
      prenom: "Adeline",
      partenaire: { prenom: "Joris", genre: "homme" },
    },
  },
  {
    nom: "Sophie (femme, famille avec Paul + Léa et Tom)",
    slug: "sophie",
    profil: {
      genre: "femme",
      typePartenaire: "famille",
      prenom: "Sophie",
      pluriel: true,
      nbEnfants: 2,
      partenaire: { prenom: "Paul", genre: "homme" },
      enfants: ["Léa", "Tom"],
    },
  },
];

function sectionsToMarkdown(sections: Record<string, string>): string {
  const lines: string[] = [];
  for (const id of SECTION_ORDER) {
    const label = SECTION_LABELS[id];
    const content = sections[id];
    if (label && content) {
      lines.push(`## ${label}\n\n`);
      lines.push(content);
      lines.push("\n\n");
    }
  }
  return lines.join("").trimEnd();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionsToHtmlFragment(
  sections: Record<string, string>,
  titreProfil: string,
): string {
  const parts: string[] = [
    `<h1 style="font-size:18pt;margin-top:24pt;margin-bottom:12pt;border-bottom:2px solid #333;page-break-before:always;">${escapeHtml(titreProfil)}</h1>`,
  ];
  for (const id of SECTION_ORDER) {
    const label = SECTION_LABELS[id];
    const content = sections[id];
    if (label && content) {
      parts.push(
        `<h2 style="font-size:14pt;margin-top:14pt;">${escapeHtml(label)}</h2>`,
      );
      parts.push(
        `<p style="white-space:pre-wrap;margin:0 0 8pt;">${escapeHtml(content)}</p>`,
      );
    }
  }
  return parts.join("\n");
}

function main() {
  const inputPath = process.argv[2];
  const villeArg = process.argv[3];

  if (!inputPath) {
    console.error(
      "Usage: npx tsx scripts/test-adaptation-ville.ts <fichier-raw.txt> [Ville]",
    );
    process.exit(1);
  }

  const villeSlug =
    villeArg?.toLowerCase() ??
    basename(inputPath, ".txt").replace(/-raw$/, "");
  const villeTitre = villeArg ?? villeSlug;

  const raw = readFileSync(inputPath, "utf-8");
  const OUTPUT_DIR = join(process.cwd(), "data", "test-adaptation", "output");
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const docParts: string[] = [
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(villeTitre)} — ${PROFILS.length} profils</title></head>`,
    `<body style="font-family:Calibri,sans-serif;font-size:11pt;margin:2cm;line-height:1.4;">`,
    `<h1 style="font-size:20pt;">${escapeHtml(villeTitre)} — Tests d'adaptation (${PROFILS.length} profils)</h1>`,
    `<p>${PROFILS.map((p) => p.nom).join(" — ")}.</p>`,
  ];

  for (const { nom, slug, profil } of PROFILS) {
    const sections = parseAndAdaptRawResponse(raw, profil);
    const md = `# ${villeTitre} — ${nom}\n\n` + sectionsToMarkdown(sections);
    const outPath = join(OUTPUT_DIR, `${villeSlug}-${slug}.md`);
    writeFileSync(outPath, md, "utf-8");
    console.log(`  ✓ ${villeSlug}-${slug}.md`);

    docParts.push(sectionsToHtmlFragment(sections, `${villeTitre} — ${nom}`));
  }

  docParts.push("</body></html>");
  const docPath = join(OUTPUT_DIR, `${villeSlug}-profils.doc`);
  writeFileSync(docPath, docParts.join("\n"), "utf-8");
  console.log(`  ✓ ${villeSlug}-profils.doc`);

  console.log(`\nSortie : data/test-adaptation/output/`);
}

main();
