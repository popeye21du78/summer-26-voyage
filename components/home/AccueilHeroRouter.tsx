"use client";

import type { VoyageStateResponse } from "@/types/voyage-state";
import VoyagePrevuCountdown from "../VoyagePrevuCountdown";
import VoyageEnCoursLanding from "../VoyageEnCoursLanding";
import VoyageTermineLanding from "../VoyageTermineLanding";
import HeroNouveauVoyageur from "./HeroNouveauVoyageur";
import HeroPlanifierProchain from "./HeroPlanifierProchain";

/**
 * Sélection du hero selon l’état voyage (5 cas produit + retour récent &lt; 15 j.).
 */
export default function AccueilHeroRouter({
  state,
  profileId = "",
}: {
  state: VoyageStateResponse | null;
  profileId?: string;
}) {
  if (!state) {
    return <HeroNouveauVoyageur profileId={profileId} />;
  }

  const { etat } = state;
  const joursDepuis = state.joursDepuisFinDernierVoyage;

  if (etat === "rien") {
    return <HeroNouveauVoyageur profileId={profileId} />;
  }

  if (etat === "voyage_termine") {
    const recent =
      joursDepuis != null && joursDepuis <= 14 && state.voyagesTermines?.[0];
    if (recent) {
      return <VoyageTermineLanding state={state} />;
    }
    return <HeroPlanifierProchain state={state} />;
  }

  if (etat === "voyage_prevu" && state.voyagePrevu) {
    return (
      <VoyagePrevuCountdown
        voyage={state.voyagePrevu}
        joursRestants={state.joursRestants ?? 0}
        autresPrevus={state.voyagesPrevus}
      />
    );
  }

  if (etat === "voyage_en_cours" && state.voyageEnCours) {
    return <VoyageEnCoursLanding state={state} />;
  }

  return <HeroNouveauVoyageur profileId={profileId} />;
}
