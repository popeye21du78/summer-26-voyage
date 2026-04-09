import type { StructureOption } from "@/lib/trip-engine/types";

function newStepId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Une ligne d’étape par base (nuits regroupées — dates à saisir sur /planning). */
export function structureToPlanningPayload(structure: StructureOption) {
  return structure.bases.map((b, index) => ({
    step_id: newStepId(),
    nom: b.name,
    lat: b.lat,
    lng: b.lng,
    ordre: index,
    date_prevue: null as string | null,
    date_depart: null as string | null,
    description_culture: `${b.nights} nuit(s) — ${structure.label}. ${structure.explanations[0] ?? ""}`.slice(
      0,
      500
    ),
    budget_prevu: 0,
    nuitee_type: "airbnb" as const,
    budget_culture: 0,
    budget_nourriture: 0,
    budget_nuitee: 0,
  }));
}
