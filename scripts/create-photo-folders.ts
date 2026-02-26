/**
 * Crée l'arborescence de dossiers photos à partir d'une fiche brute.
 *
 * Lit la section ---PHOTOS--- (lieux tagués par l'IA) et les sections MANGER
 * (restaurants extraits automatiquement) pour générer :
 *
 *   photos/<slug>/
 *     _INDEX.md          ← checklist des photos attendues
 *     lieux/             ← 1 dossier par lieu mentionné
 *       <slug-lieu>/
 *     restos/            ← 1 dossier par restaurant (si MANGER présent)
 *       <slug-resto>/
 *
 * Usage: npx tsx scripts/create-photo-folders.ts <fichier-raw.txt> [dossier-photos]
 *
 * Ex:  npx tsx scripts/create-photo-folders.ts data/test-adaptation/marseille-raw.txt
 *      npx tsx scripts/create-photo-folders.ts data/test-adaptation/abbaye-de-fontenay-raw.txt photos/
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { parseRawSections } from "../lib/ville-adaptation";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''\u2019]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractPhotosLieux(sections: Record<string, string>): string[] {
  const photosSection = sections["PHOTOS"];
  if (!photosSection) return [];

  const lieux: string[] = [];
  for (const line of photosSection.split("\n")) {
    const match = line.match(/^lieu\s*:\s*(.+)/i);
    if (match) {
      lieux.push(match[1].trim());
    }
  }
  return lieux;
}

function extractRestaurants(sections: Record<string, string>): string[] {
  const restos: string[] = [];
  for (const [id, text] of Object.entries(sections)) {
    if (!id.startsWith("MANGER")) continue;
    for (const line of text.split("\n")) {
      // "• Nom : Le Cantou" or "• Le Cantou" (old format)
      const match =
        line.match(/•\s*Nom\s*:\s*(.+)/) ??
        line.match(/^•\s+([A-ZÀ-ÿ].+?)\s*$/);
      if (match) {
        restos.push(match[1].trim());
      }
    }
  }
  return restos;
}

function buildIndex(lieuName: string, lieux: string[], restos: string[]): string {
  const lines: string[] = [];
  lines.push(`# Photos attendues — ${lieuName}`);
  lines.push("");
  lines.push("## Couvertures (à la racine du dossier)");
  lines.push("- `1.jpg` — photo principale (héros)");
  lines.push("- `2.jpg` — photo secondaire");
  lines.push("- `3.jpg` — photo tertiaire");

  if (lieux.length > 0) {
    lines.push("");
    lines.push("## Lieux (dossier `lieux/`)");
    for (const l of lieux) {
      lines.push(`- \`${slugify(l)}/\` — ${l}`);
    }
  }

  if (restos.length > 0) {
    lines.push("");
    lines.push("## Restaurants (dossier `restos/`)");
    for (const r of restos) {
      lines.push(`- \`${slugify(r)}/\` — ${r}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function processOneFile(inputPath: string, photosRoot: string) {
  const raw = readFileSync(inputPath, "utf-8");
  const sections = parseRawSections(raw);

  const fileSlug = basename(inputPath).replace(/-raw(-fixed)?\.txt$/, "");
  const lieuName = fileSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const lieux = extractPhotosLieux(sections);
  const restos = extractRestaurants(sections);

  console.log(`\n→ ${lieuName} (${fileSlug})`);
  console.log(`  Lieux : ${lieux.length > 0 ? lieux.join(", ") : "(aucun tag PHOTOS)"}`);
  console.log(`  Restos : ${restos.length > 0 ? restos.join(", ") : "—"}`);

  const lieuDir = join(photosRoot, fileSlug);
  mkdirSync(lieuDir, { recursive: true });

  if (lieux.length > 0) {
    const lieuxDir = join(lieuDir, "lieux");
    mkdirSync(lieuxDir, { recursive: true });
    for (const l of lieux) {
      mkdirSync(join(lieuxDir, slugify(l)), { recursive: true });
    }
  }

  if (restos.length > 0) {
    const restosDir = join(lieuDir, "restos");
    mkdirSync(restosDir, { recursive: true });
    for (const r of restos) {
      mkdirSync(join(restosDir, slugify(r)), { recursive: true });
    }
  }

  const indexContent = buildIndex(lieuName, lieux, restos);
  writeFileSync(join(lieuDir, "_INDEX.md"), indexContent, "utf-8");

  console.log(`  ✓ ${lieuDir}/`);
  return { lieux: lieux.length, restos: restos.length };
}

function main() {
  const inputPath = process.argv[2];
  const photosRoot = process.argv[3] ?? join(process.cwd(), "photos");

  if (!inputPath) {
    console.error(
      "Usage:\n" +
      "  npx tsx scripts/create-photo-folders.ts <fichier-raw.txt> [dossier-photos]\n" +
      "  npx tsx scripts/create-photo-folders.ts <dossier-raw/> [dossier-photos]  (mode batch)"
    );
    process.exit(1);
  }

  if (!existsSync(inputPath)) {
    console.error(`Introuvable : ${inputPath}`);
    process.exit(1);
  }

  const isDir = statSync(inputPath).isDirectory();
  const files: string[] = [];

  if (isDir) {
    const allRaw = readdirSync(inputPath).filter((f) => f.match(/-raw(-fixed)?\.txt$/));
    const bySlug = new Map<string, string>();
    for (const f of allRaw) {
      const slug = f.replace(/-raw(-fixed)?\.txt$/, "");
      const isFixed = f.includes("-fixed");
      if (!bySlug.has(slug) || isFixed) {
        bySlug.set(slug, f);
      }
    }
    for (const f of bySlug.values()) {
      files.push(join(inputPath, f));
    }
    if (files.length === 0) {
      console.error(`Aucun fichier *-raw.txt trouvé dans ${inputPath}`);
      process.exit(1);
    }
    console.log(`Mode batch : ${files.length} lieu(x) (${allRaw.length} fichiers, version -fixed prioritaire)`);
  } else {
    files.push(inputPath);
  }

  let totalLieux = 0;
  let totalRestos = 0;
  for (const f of files) {
    const r = processOneFile(f, photosRoot);
    totalLieux += r.lieux;
    totalRestos += r.restos;
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✓ ${files.length} lieu(x) traité(s)`);
  console.log(`  ${totalLieux} dossier(s) lieux • ${totalRestos} dossier(s) restos`);
  console.log(`  Racine : ${photosRoot}/`);
  console.log(`\n→ Dépose tes photos dans les dossiers correspondants !`);
}

main();
