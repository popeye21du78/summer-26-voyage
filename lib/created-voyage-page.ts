import type { Voyage } from "@/data/mock-voyages";
import type { Step } from "@/types";
import type { CreatedVoyage } from "@/lib/created-voyages";
import { mergeVoyageSteps } from "@/lib/voyage-local-overrides";

/**
 * Voyage client (`created-…` dans localStorage) → modèle d’écran
 * « Mon espace / voyage [slug] ».
 */
export function createdVoyageToVoyageView(local: CreatedVoyage): Voyage {
  const baseSteps: Step[] = local.steps.map((s) => ({
    id: s.id,
    nom: s.nom,
    coordonnees: {
      lat: s.lat ?? 46.2276,
      lng: s.lng ?? 2.2137,
    },
    date_prevue: s.date_prevue ?? "",
    description_culture: "",
    budget_prevu: 0,
    nuitee_type: s.type === "passage" ? "passage" : "van",
    contenu_voyage: { photos: [] },
  }));
  const steps = mergeVoyageSteps(baseSteps, local.id);
  return {
    id: local.id,
    titre: local.titre,
    sousTitre: local.sousTitre,
    region: "France",
    dureeJours: steps.length,
    dateDebut: local.dateDebut ?? steps[0]?.date_prevue ?? "",
    steps,
    stats: local.stats
      ? {
          km: local.stats.totalKm,
          essence: Math.round(local.stats.totalKm * 0.12),
        }
      : undefined,
    routeGeometry: local.routeGeometry ?? null,
    routeLegs: local.legs,
    routeProfile: local.routeProfile ?? "driving",
  };
}
