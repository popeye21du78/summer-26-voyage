import { NextRequest, NextResponse } from "next/server";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const PHOTOS_DIR = join(process.cwd(), "photos");

/** GET /api/photo-selection-lieux?skip=0&limit=30 - Liste des slugs avec commons-candidates, paginée. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    if (!existsSync(PHOTOS_DIR)) {
      return NextResponse.json({ slugs: [], total: 0 });
    }

    const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .filter((d) => existsSync(join(PHOTOS_DIR, d.name, "commons-candidates.json")))
      .map((d) => d.name)
      .sort();

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
