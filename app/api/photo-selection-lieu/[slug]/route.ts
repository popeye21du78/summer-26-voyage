import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const PHOTOS_DIR = join(process.cwd(), "photos");

/** GET /api/photo-selection-lieu/[slug] - Données commons-candidates pour un lieu. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug?.trim()) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const path = join(PHOTOS_DIR, slug, "commons-candidates.json");
    if (!existsSync(path)) {
      return NextResponse.json({ error: "Lieu non trouvé" }, { status: 404 });
    }

    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
