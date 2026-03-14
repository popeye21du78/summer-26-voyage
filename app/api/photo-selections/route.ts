import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const SELECTIONS_FILE = join(process.cwd(), "data", "photo-selections.json");

export type PhotoSelections = Record<
  string,
  {
    header: string[];
    lieux: Record<string, string | null>;
  }
>;

function readSelections(): PhotoSelections {
  try {
    if (existsSync(SELECTIONS_FILE)) {
      const raw = readFileSync(SELECTIONS_FILE, "utf-8");
      return JSON.parse(raw) as PhotoSelections;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** GET /api/photo-selections - Retourne toutes les sélections. */
export async function GET() {
  try {
    const data = readSelections();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** POST /api/photo-selections - Sauvegarde les sélections pour un lieu. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, header, lieux } = body as {
      slug: string;
      header: string[];
      lieux: Record<string, string | null>;
    };

    if (!slug?.trim()) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const all = readSelections();
    all[slug] = {
      header: Array.isArray(header) ? header.filter(Boolean) : [],
      lieux: lieux && typeof lieux === "object" ? lieux : {},
    };

    const dir = dirname(SELECTIONS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      SELECTIONS_FILE,
      JSON.stringify(all, null, 2),
      "utf-8"
    );

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
