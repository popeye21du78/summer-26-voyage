import { NextRequest, NextResponse } from "next/server";
import {
  deleteItineraryStepsNotIn,
  getItinerary,
  upsertItinerary,
  type ItineraryRow,
} from "../../../lib/itinerary-supabase";

export async function GET() {
  try {
    const rows = await getItinerary();
    return NextResponse.json({ steps: rows });
  } catch (e) {
    console.error("API GET itinerary:", e);
    return NextResponse.json({ steps: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { steps } = body as { steps: ItineraryRow[] };
    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "steps requis (array)" },
        { status: 400 }
      );
    }
    const stepIds = steps.map((s) => s.step_id);
    const deleteResult = await deleteItineraryStepsNotIn(stepIds);
    if (!deleteResult.ok) {
      return NextResponse.json(
        { error: deleteResult.error ?? "Erreur suppression" },
        { status: 500 }
      );
    }
    if (steps.length === 0) {
      return NextResponse.json({ ok: true });
    }
    const rows = steps.map((s, i) => ({
      step_id: s.step_id,
      nom: s.nom,
      lat: s.lat,
      lng: s.lng,
      ordre: s.ordre ?? i,
      date_prevue: s.date_prevue ?? null,
      date_depart: s.date_depart ?? null,
      description_culture: s.description_culture ?? "",
      budget_prevu: s.budget_prevu ?? 0,
      nuitee_type: s.nuitee_type ?? null,
      budget_culture: s.budget_culture ?? 0,
      budget_nourriture: s.budget_nourriture ?? 0,
      budget_nuitee: s.budget_nuitee ?? 0,
    }));
    const result = await upsertItinerary(rows);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Erreur" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API POST itinerary:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
