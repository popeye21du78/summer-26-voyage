import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getVoyageForProfile,
  getStepsOfDay,
  joursJusquau,
} from "../../../data/mock-voyages";
import type { VoyageStateResponse } from "@/types/voyage-state";
import { computeDailyContentIds } from "@/lib/home-content";

const FIRST_LOGIN_COOKIE = "voyage_first_login_date";

export type { VoyageStateResponse };

function hoursUntil(dateIso: string): number {
  const now = new Date();
  const target = new Date(`${dateIso}T08:00:00`);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 3600000));
}

function detectOpenMoment(date: Date): "morning" | "afternoon" | "evening" {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function hasUpcomingTripConflicts(
  voyages: NonNullable<VoyageStateResponse["voyagesPrevus"]>
): boolean {
  if (voyages.length < 2) return false;
  const ranges = voyages.map((voyage) => {
    const start = new Date(`${voyage.dateDebut}T12:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, voyage.dureeJours - 1));
    return { start, end };
  });

  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end) {
        return true;
      }
    }
  }
  return false;
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

    let joursRestantsApi = state.joursRestants;
    if (state.etat === "voyage_prevu" && state.voyagePrevu) {
      joursRestantsApi = joursJusquau(state.voyagePrevu.dateDebut);
    }

    const voyagesPrevus = state.voyagesPrevus ?? (state.voyagePrevu ? [state.voyagePrevu] : []);
    const hasPastTrip = (state.voyagesTermines?.length ?? 0) > 0;
    const hasUpcomingTrip = voyagesPrevus.length > 0;
    const hasMultipleUpcomingTrips = voyagesPrevus.length > 1;
    const hasCurrentTrip = Boolean(state.voyageEnCours);
    const hasAnyTrip = hasPastTrip || hasUpcomingTrip || hasCurrentTrip;
    const nextTrip = voyagesPrevus[0];
    const currentStepName = stepsDuJour?.[0]?.nom;
    const nextStepName =
      state.etat === "voyage_en_cours" &&
      state.voyageEnCours &&
      state.jourActuel != null
        ? state.voyageEnCours.steps[state.jourActuel]?.nom
        : undefined;
    const openMoment = detectOpenMoment(new Date());
    const dailyIds = computeDailyContentIds(profileId);

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
      hasAnyTrip,
      hasPastTrip,
      hasUpcomingTrip,
      hasMultipleUpcomingTrips,
      hasCurrentTrip,
      hoursUntilNextTripStart: nextTrip ? hoursUntil(nextTrip.dateDebut) : undefined,
      currentTripTotalDays: state.voyageEnCours?.dureeJours ?? state.voyageEnCours?.steps.length,
      currentStepName,
      nextStepName,
      isSharedTrip: state.voyageEnCours?.estPartage ?? false,
      isFirstAppOpenEver: state.etat === "rien" && !lastLogin,
      isFirstOpenOfSession: premiereConnexionDuJour,
      openMoment,
      hasLocationEnabled: undefined,
      hasConflictingUpcomingTrips: hasMultipleUpcomingTrips
        ? hasUpcomingTripConflicts(voyagesPrevus)
        : false,
      dailyThoughtId: dailyIds.dailyThoughtId,
      dailyEditorialCardId: dailyIds.dailyEditorialCardId,
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
