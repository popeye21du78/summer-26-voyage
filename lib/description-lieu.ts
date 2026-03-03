/**
 * Lecture des descriptions de lieux (data/descriptions).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DESCRIPTIONS_DIR = join(process.cwd(), "data", "descriptions");

export function getDescriptionForSlug(slug: string): string | null {
  const s = slug.toLowerCase().trim();
  if (!s) return null;

  const fixedPath = join(DESCRIPTIONS_DIR, `${s}-raw-fixed.txt`);
  const rawPath = join(DESCRIPTIONS_DIR, `${s}-raw.txt`);

  if (existsSync(fixedPath)) {
    return readFileSync(fixedPath, "utf-8").trim();
  }
  if (existsSync(rawPath)) {
    return readFileSync(rawPath, "utf-8").trim();
  }
  return null;
}

export function hasDescriptionForSlug(slug: string): boolean {
  return getDescriptionForSlug(slug) !== null;
}

/** Extrait les lieux de la section ---PHOTOS--- (lieu: X). */
export function getPhotoSlotsFromDescription(description: string): string[] {
  const match = description.match(/---PHOTOS---\s*([\s\S]*?)(?=---|$)/i);
  if (!match) return [];

  const lines = match[1].trim().split("\n");
  const lieux: string[] = [];
  for (const line of lines) {
    const m = line.match(/^lieu\s*:\s*(.+)/i);
    if (m) lieux.push(m[1].trim());
  }
  return lieux;
}
