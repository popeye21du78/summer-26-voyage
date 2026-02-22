/**
 * Génère docs/Prompt-ville-API.doc à partir de docs/prompt-ville-api.md.
 * Même méthode que test-adaptation-toulouse.ts : HTML minimal, charset utf-8, écrit en UTF-8.
 * Word ouvre ce .doc correctement avec tous les accents.
 *
 * Usage: npx tsx scripts/prompt-md-to-word.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(process.cwd());
const MD_PATH = join(ROOT, "docs", "prompt-ville-api.md");
const DOC_PATH = join(ROOT, "docs", "Prompt-ville-API.doc");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mdLineToHtml(line: string): string {
  const t = escapeHtml(line);
  const bold = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const code = bold.replace(/`([^`]+)`/g, "<code>$1</code>");
  return code;
}

function mdToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let inPre = false;
  let preBuf: string[] = [];

  const flushPre = () => {
    if (preBuf.length) {
      out.push("<pre style='background:#f5f5f5;padding:10pt;font-family:Consolas;font-size:9pt;white-space:pre-wrap;'>");
      out.push(escapeHtml(preBuf.join("\n")));
      out.push("</pre>");
      preBuf = [];
    }
    inPre = false;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      flushPre();
      inPre = !inPre;
      i++;
      continue;
    }
    if (inPre) {
      preBuf.push(raw);
      i++;
      continue;
    }

    if (line === "---") {
      flushPre();
      out.push("<hr style='margin:16pt 0'>");
      i++;
      continue;
    }
    if (line === "") {
      flushPre();
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      flushPre();
      out.push(`<h1 style='font-size:18pt;margin-top:24pt;margin-bottom:12pt;border-bottom:2px solid #333;'>${mdLineToHtml(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      flushPre();
      out.push(`<h2 style='font-size:14pt;margin-top:18pt;margin-bottom:8pt;'>${mdLineToHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      flushPre();
      out.push(`<h3 style='font-size:12pt;margin-top:14pt;margin-bottom:6pt;'>${mdLineToHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (line.startsWith("  - ")) {
      flushPre();
      out.push(`<p style='margin:2pt 0 2pt 32pt;'>${mdLineToHtml(line.slice(4))}</p>`);
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      flushPre();
      out.push(`<p style='margin:4pt 0 4pt 24pt;'>${mdLineToHtml(line.slice(2))}</p>`);
      i++;
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*") && line.length > 1 && !line.startsWith("**")) {
      flushPre();
      const inner = mdLineToHtml(line.slice(1, -1));
      out.push(`<p style='margin:6pt 0;font-style:italic;'>${inner}</p>`);
      i++;
      continue;
    }

    if (line.startsWith("**") && line.includes(" :")) {
      const idx = line.indexOf(" :");
      const label = line.slice(0, idx + 1);
      const rest = line.slice(idx + 2);
      flushPre();
      out.push(`<p style='margin:6pt 0;'><strong>${mdLineToHtml(label)}</strong> ${mdLineToHtml(rest)}</p>`);
      i++;
      continue;
    }

    flushPre();
    out.push(`<p style='margin:6pt 0;'>${mdLineToHtml(line)}</p>`);
    i++;
  }
  flushPre();
  return out.join("\n");
}

function main() {
  const md = readFileSync(MD_PATH, "utf-8");
  const body = mdToHtml(md);

  const html = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<title>Prompt API — Fiche ville complète (Top 100)</title>",
    "</head>",
    "<body style='font-family:Calibri,sans-serif;font-size:11pt;margin:2cm;line-height:1.4;'>",
    body,
    "</body>",
    "</html>",
  ].join("\n");

  try {
    writeFileSync(DOC_PATH, html, "utf-8");
    console.log("Fichier généré : docs/Prompt-ville-API.doc (UTF-8, ouvrable dans Word)");
  } catch (e: any) {
    const code = e?.code as string | undefined;
    if (code === "EBUSY" || code === "EPERM") {
      const fallbackPath = join(ROOT, "docs", "Prompt-ville-API.NEW.doc");
      writeFileSync(fallbackPath, html, "utf-8");
      console.log(
        "Impossible d'écrire docs/Prompt-ville-API.doc (verrouillé)."
      );
      console.log(
        "Fichier généré à la place : docs/Prompt-ville-API.NEW.doc (UTF-8)"
      );
      return;
    }
    throw e;
  }
}

main();
