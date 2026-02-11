import { NextResponse } from "next/server";
import { getSteps } from "../../../lib/getSteps";

/**
 * Retourne les étapes du voyage : Supabase itinerary si peuplé, sinon mockSteps.
 * Utilisé par la carte, le Book, etc.
 */
export async function GET() {
  try {
    const steps = await getSteps();
    return NextResponse.json({ steps });
  } catch (e) {
    console.error("API GET steps:", e);
    return NextResponse.json({ steps: [] });
  }
}
