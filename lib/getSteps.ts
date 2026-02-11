import { getItinerary, itineraryRowToStep } from "./itinerary-supabase";
import { mockSteps } from "../data/mock-steps";
import type { Step } from "../types";

/**
 * Retourne les étapes du voyage : Supabase itinerary si peuplé, sinon mockSteps.
 * Utilisable côté serveur (pages) et côté client (via API).
 */
export async function getSteps(): Promise<Step[]> {
  const rows = await getItinerary();
  if (rows.length > 0) {
    return rows.map(itineraryRowToStep);
  }
  return mockSteps;
}
