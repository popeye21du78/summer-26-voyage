import type { BookSection } from "../types";
import { mockSteps } from "./mock-steps";

/**
 * Sections Book par ville – mock pour le design.
 * Plus tard : chargé depuis Supabase.
 */
export const mockBookSections: BookSection[] = mockSteps.map((step) => ({
  step_id: step.id,
  photos: step.contenu_voyage.photos,
  texte: step.contenu_voyage.anecdote ?? "",
  style: {
    police_titre: "serif",
    police_sous_titre: "sans",
    gras: true,
    italique: false,
    layout: step.contenu_voyage.photos.length >= 2 ? "grid2" : "single",
  },
}));

export function getBookSection(stepId: string): BookSection | undefined {
  return mockBookSections.find((s) => s.step_id === stepId);
}
