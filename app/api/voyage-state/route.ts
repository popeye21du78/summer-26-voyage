import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getVoyageForProfile,
  getStepsOfDay,
  joursJusquau,
} from "../../../data/mock-voyages";
import type { VoyageStateResponse } from "@/types/voyage-state";

const FIRST_LOGIN_COOKIE = "voyage_first_login_date";

export type { VoyageStateResponse };

export async function GET() {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("van_auth")?.value ?? "";

    if (!profileId) {
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const state = getVoyageForProfile(profileId);
    const today = new Date().toDateString();

    let premiereConnexionDuJour = false;
    const lastLogin = cookieStore.get(FIRST_LOGIN_COOKIE)?.value;

    if (state.etat === "voyage_en_cours" && state.voyageEnCours) {
      if (lastLogin !== today) {
        premiereConnexionDuJour = true;
        // On ne set pas le cookie ici (côté serveur) pour éviter les effets de cache
        // Le client le fera après affichage
      }
    }

    const stepsDuJour =
      state.etat === "voyage_en_cours" &&
      state.voyageEnCours &&
      state.jourActuel != null
        ? getStepsOfDay(state.voyageEnCours, state.jourActuel - 1).map(
            (s) => ({
              id: s.id,
              nom: s.nom,
              lat: s.coordonnees.lat,
              lng: s.coordonnees.lng,
              description: s.description_culture,
              dureeConseillee: "2-3 h",
            })
          )
        : undefined;

    let joursDepuisFinDernierVoyage: number | undefined;
    if (state.etat === "voyage_termine" && state.voyagesTermines?.[0]) {
      const dernier = state.voyagesTermines[0];
      const lastStep = dernier.steps[dernier.steps.length - 1];
      const dateFin = lastStep?.date_prevue ?? dernier.dateDebut;
      const fin = new Date(dateFin);
      const now = new Date();
      fin.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      joursDepuisFinDernierVoyage = Math.floor(
        (now.getTime() - fin.getTime()) / 86400000
      );
    }

    let joursRestantsApi = state.joursRestants;
    if (state.etat === "voyage_prevu" && state.voyagePrevu) {
      joursRestantsApi = joursJusquau(state.voyagePrevu.dateDebut);
    }

    const res: VoyageStateResponse = {
      profileId,
      etat: state.etat,
      voyageEnCours: state.voyageEnCours,
      voyagePrevu: state.voyagePrevu,
      voyagesPrevus: state.voyagesPrevus,
      voyagesTermines: state.voyagesTermines,
      jourActuel: state.jourActuel,
      joursRestants: joursRestantsApi,
      joursDepuisFinDernierVoyage,
      premiereConnexionDuJour,
      stepsDuJour,
    };

    return NextResponse.json(res);
  } catch (e) {
    console.error("API voyage-state:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
