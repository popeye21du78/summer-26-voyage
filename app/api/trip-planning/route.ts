import { NextResponse } from "next/server";
import { getItinerary, upsertItinerary } from "@/lib/itinerary-supabase";

/**
 * Étapes « planning » (table Supabase itinerary) — lecture / sauvegarde.
 * Remplace l’ancien GET/POST implicite sur /api/itinerary (générateur supprimé).
 */
export async function GET() {
  try {
    const steps = await getItinerary();
    return NextResponse.json({ steps });
  } catch (e) {
    console.error("GET /api/trip-planning:", e);
    return NextResponse.json({ steps: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const steps = body?.steps;
    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { ok: false, error: "Body.steps (tableau) requis" },
        { status: 400 }
      );
    }
    const result = await upsertItinerary(steps);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
