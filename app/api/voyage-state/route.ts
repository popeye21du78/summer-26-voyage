import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getVoyageForProfile,
  getStepsOfDay,
  type EtatVoyage,
} from "../../../data/mock-voyages";
import type { Voyage } from "../../../data/mock-voyages";

const FIRST_LOGIN_COOKIE = "voyage_first_login_date";

export interface VoyageStateResponse {
  profileId: string;
  etat: EtatVoyage;
  voyageEnCours?: Voyage;
  voyagePrevu?: Voyage;
  voyagesTermines?: Voyage[];
  jourActuel?: number;
  joursRestants?: number;
  /** Jours depuis la fin du dernier voyage (pour Léa, Thomas) */
  joursDepuisFinDernierVoyage?: number;
  /** Première connexion du jour (voyage en cours) → afficher full page journée */
  premiereConnexionDuJour?: boolean;
  /** Steps du jour (pour la page "journée du jour") */
  stepsDuJour?: Array<{
    id: string;
    nom: string;
    lat: number;
    lng: number;
    description: string;
    dureeConseillee?: string;
  }>;
}

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

    const res: VoyageStateResponse = {
      profileId,
      etat: state.etat,
      voyageEnCours: state.voyageEnCours,
      voyagePrevu: state.voyagePrevu,
      voyagesTermines: state.voyagesTermines,
      jourActuel: state.jourActuel,
      joursRestants: state.joursRestants,
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
