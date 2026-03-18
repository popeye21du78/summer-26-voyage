import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const EXCLUDED_FILE = join(process.cwd(), "data", "excluded-lieux.json");

function readExcluded(): string[] {
  try {
    if (existsSync(EXCLUDED_FILE)) {
      const raw = readFileSync(EXCLUDED_FILE, "utf-8");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeExcluded(slugs: string[]) {
  const dir = dirname(EXCLUDED_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(EXCLUDED_FILE, JSON.stringify([...new Set(slugs)].sort(), null, 2), "utf-8");
}

/** GET /api/excluded-lieux - Liste des slugs exclus. */
export async function GET() {
  try {
    const excluded = readExcluded();
    return NextResponse.json({ excluded });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** POST /api/excluded-lieux - Ajoute un slug à la liste des exclus. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug.trim() : null;
    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const excluded = readExcluded();
    if (!excluded.includes(slug)) {
      excluded.push(slug);
      writeExcluded(excluded);
    }

    return NextResponse.json({ ok: true, excluded });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** DELETE /api/excluded-lieux - Retire un slug des exclus (réintègre). */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const excluded = readExcluded().filter((s) => s !== slug);
    writeExcluded(excluded);

    return NextResponse.json({ ok: true, excluded });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
