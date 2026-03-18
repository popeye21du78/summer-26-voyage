import { NextRequest, NextResponse } from "next/server";
import { fetchCommonsForLieu } from "../../../../lib/fetch-commons-for-lieu";

/** Timeout long pour les requêtes Wikimedia (3–4 min possibles). */
export const maxDuration = 300;

/** GET /api/photo-selection-lieu/[slug] - Données Commons pour un lieu. Utilise la nouvelle stratégie (v2) pour toutes les villes. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug?.trim()) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const data = await fetchCommonsForLieu(slug);
    if (!data) {
      return NextResponse.json({ error: "Lieu non trouvé (pas de description)" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
