import { NextRequest, NextResponse } from "next/server";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const PHOTOS_DIR = join(process.cwd(), "photos");
const EXCLUDED_FILE = join(process.cwd(), "data", "excluded-lieux.json");
const SELECTIONS_FILE = join(process.cwd(), "data", "photo-selections.json");

function readExcluded(): Set<string> {
  try {
    if (existsSync(EXCLUDED_FILE)) {
      const raw = readFileSync(EXCLUDED_FILE, "utf-8")?.trim();
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === "string") : []);
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

function readCompletedSlugs(): Set<string> {
  try {
    if (existsSync(SELECTIONS_FILE)) {
      const raw = readFileSync(SELECTIONS_FILE, "utf-8").trim();
      if (!raw) return new Set();
      const obj = JSON.parse(raw);
      return new Set(Object.keys(obj ?? {}));
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

/** Slugs pour le mode test (Belvès + Beynac-et-Cazenac uniquement). */
const TEST_SLUGS = ["belves", "beynac-et-cazenac"];

/** GET /api/photo-selection-lieux?skip=0&limit=30 - Liste des slugs. ?test=1 limite à Belvès et Beynac pour debug. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const testMode = searchParams.get("test") === "1";

    if (!existsSync(PHOTOS_DIR)) {
      return NextResponse.json({ slugs: [], total: 0 });
    }

    const excluded = readExcluded();
    const completed = readCompletedSlugs();
    const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
    let dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .filter((d) => !excluded.has(d.name))
      .filter((d) => !completed.has(d.name))
      .filter((d) => existsSync(join(PHOTOS_DIR, d.name, "commons-candidates.json")))
      .map((d) => d.name)
      .sort();

    if (testMode) {
      dirs = dirs.filter((d) => TEST_SLUGS.includes(d));
    }

    const total = dirs.length;
    const slugs = dirs.slice(skip, skip + limit);

    return NextResponse.json({ slugs, total });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
