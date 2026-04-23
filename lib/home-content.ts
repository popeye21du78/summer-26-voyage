import type { VoyageStateResponse } from "@/types/voyage-state";

export type HomeOpenMoment = "morning" | "afternoon" | "evening";

export type HomeScenarioId =
  | "no_trip_ever"
  | "history_no_upcoming"
  | "very_recent_return"
  | "upcoming_far"
  | "upcoming_mid"
  | "upcoming_soon"
  | "depart_under_24h"
  | "multiple_upcoming"
  | "multiple_upcoming_conflict"
  | "current_trip_solo"
  | "current_trip_shared";

export type HomeCta = {
  label: string;
  href: string;
  tone: "primary" | "secondary";
};

export type HomeDailyThought = {
  id: string;
  text: string;
  href: string;
};

export type HomeEditorialCard = {
  id: string;
  kicker: string;
  title: string;
  excerpt: string;
  href: string;
};

export type HomeTripCard = {
  title: string;
  detail: string;
  badge?: string;
};

export type HomeDaySheet = {
  title: string;
  subtitle: string;
  notePrompt: string;
  checklist: string[];
};

export type HomeScenarioViewModel = {
  scenarioId: HomeScenarioId;
  layout: "standard" | "onTrip";
  background: "video" | "return" | "road";
  eyebrow?: string;
  headline: string;
  subheadline: string;
  statusChip?: string;
  primaryCta: HomeCta;
  secondaryCta?: HomeCta;
  dailyThought?: HomeDailyThought;
  editorialCard?: HomeEditorialCard;
  tripCard?: HomeTripCard;
  daySheet?: HomeDaySheet;
  gentleAlert?: string;
};

type ScenarioContext = {
  profileId: string;
  profileName: string;
  firstName: string;
  state: VoyageStateResponse | null;
  openMoment: HomeOpenMoment;
  nextTripName: string;
  currentTripName: string;
  daysUntilNextTripStart: number;
  hoursUntilNextTripStart: number;
  daysSinceLastTripEnd: number;
  currentTripDayIndex: number;
  currentTripTotalDays: number;
  currentStepName: string;
  nextStepName: string;
  upcomingTripCount: number;
};

const DAILY_THOUGHTS: HomeDailyThought[] = [
  { id: "thought-1", text: "Partir, c’est avancer.", href: "/mon-espace" },
  { id: "thought-2", text: "Le monde est plus grand que tes habitudes.", href: "/mon-espace" },
  { id: "thought-3", text: "Tu ne reviens jamais pareil.", href: "/mon-espace" },
  { id: "thought-4", text: "Rien ne remplace le réel.", href: "/mon-espace" },
  { id: "thought-5", text: "Chaque départ compte.", href: "/mon-espace" },
  { id: "thought-6", text: "Le reste peut attendre.", href: "/mon-espace" },
  { id: "thought-7", text: "Regarde autour.", href: "/mon-espace" },
  { id: "thought-8", text: "Ralentis.", href: "/mon-espace" },
  { id: "thought-9", text: "Respire.", href: "/mon-espace" },
  { id: "thought-10", text: "Continue.", href: "/mon-espace" },
];

const DAILY_EDITORIAL_CARDS: HomeEditorialCard[] = [
  {
    id: "editorial-1",
    kicker: "Pensée du jour",
    title: "Pourquoi garder une trace change le voyage",
    excerpt: "Un carnet n’est pas juste un souvenir. C’est une manière de revivre et de comprendre ce qu’on a vécu.",
    href: "/mon-espace?section=createur&marqueTab=articles&article=editorial-1",
  },
  {
    id: "editorial-2",
    kicker: "Marque",
    title: "Une autre manière de préparer un départ",
    excerpt: "Anticiper ne veut pas dire tout verrouiller. Viago peut aussi servir à garder de la place pour l’imprévu.",
    href: "/mon-espace?section=createur&marqueTab=articles&article=editorial-2",
  },
  {
    id: "editorial-3",
    kicker: "Inspiration",
    title: "Les micro-départs comptent aussi",
    excerpt: "Pas besoin d’attendre le grand voyage. Quelques jours bien pensés peuvent déjà changer le rythme.",
    href: "/mon-espace?section=createur&marqueTab=articles&article=editorial-3",
  },
  {
    id: "editorial-4",
    kicker: "Façon de voyager",
    title: "Le bon itinéraire n’est pas toujours le plus chargé",
    excerpt: "Voir moins, mais mieux, peut rendre un voyage plus dense et plus vivant.",
    href: "/mon-espace?section=createur&marqueTab=articles&article=editorial-4",
  },
  {
    id: "editorial-5",
    kicker: "Viago",
    title: "Préparer, tracer, puis improviser",
    excerpt: "L’intérêt du pré-construit n’est pas d’enfermer. C’est de t’offrir un point de départ solide.",
    href: "/mon-espace?section=createur&marqueTab=articles&article=editorial-5",
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDeterministic<T>(pool: T[], seed: string): T {
  if (pool.length === 0) {
    throw new Error("pool must not be empty");
  }
  return pool[hashString(seed) % pool.length] as T;
}

function sanitizeFirstName(profileName: string): string {
  return profileName.trim().split(/\s+/)[0] || "Voyageur";
}

function buildContext(
  state: VoyageStateResponse | null,
  profileId: string,
  profileName: string
): ScenarioContext {
  const firstName = sanitizeFirstName(profileName);
  const nextTrip = state?.voyagesPrevus?.[0] ?? state?.voyagePrevu;
  const currentTrip = state?.voyageEnCours;

  return {
    profileId,
    profileName,
    firstName,
    state,
    openMoment: state?.openMoment ?? "afternoon",
    nextTripName: nextTrip?.titre ?? "Ton prochain voyage",
    currentTripName: currentTrip?.titre ?? "Ton voyage",
    daysUntilNextTripStart: state?.joursRestants ?? 0,
    hoursUntilNextTripStart: state?.hoursUntilNextTripStart ?? 0,
    daysSinceLastTripEnd: state?.joursDepuisFinDernierVoyage ?? 0,
    currentTripDayIndex: state?.jourActuel ?? 1,
    currentTripTotalDays:
      state?.currentTripTotalDays ??
      currentTrip?.dureeJours ??
      currentTrip?.steps.length ??
      1,
    currentStepName:
      state?.currentStepName ??
      state?.stepsDuJour?.[0]?.nom ??
      currentTrip?.steps[0]?.nom ??
      "Étape du jour",
    nextStepName:
      state?.nextStepName ??
      currentTrip?.steps[(state?.jourActuel ?? 1)]?.nom ??
      "Suite du voyage",
    upcomingTripCount:
      state?.voyagesPrevus?.length ??
      (state?.voyagePrevu ? 1 : 0),
  };
}

function selectThought(state: VoyageStateResponse | null, profileId: string): HomeDailyThought {
  const thoughtId = state?.dailyThoughtId;
  if (thoughtId) {
    const exact = DAILY_THOUGHTS.find((item) => item.id === thoughtId);
    if (exact) return exact;
  }
  return pickDeterministic(DAILY_THOUGHTS, `${profileId}:thought`);
}

function selectEditorialCard(
  state: VoyageStateResponse | null,
  profileId: string
): HomeEditorialCard {
  const editorialId = state?.dailyEditorialCardId;
  if (editorialId) {
    const exact = DAILY_EDITORIAL_CARDS.find((item) => item.id === editorialId);
    if (exact) return exact;
  }
  return pickDeterministic(DAILY_EDITORIAL_CARDS, `${profileId}:editorial`);
}

function scenarioSeed(ctx: ScenarioContext, scenarioId: HomeScenarioId, slot: string): string {
  return `${ctx.profileId}:${scenarioId}:${slot}:${ctx.openMoment}:${ctx.daysUntilNextTripStart}:${ctx.daysSinceLastTripEnd}`;
}

function scenarioLabelPool(
  ctx: ScenarioContext,
  scenarioId: HomeScenarioId,
  slot: "eyebrow" | "headline" | "subheadline"
): string[] {
  switch (scenarioId) {
    case "no_trip_ever":
      if (slot === "headline") {
        return [
          "Lance ton premier grand départ",
          "Ton prochain souvenir commence ici",
          "Le plus dur, c’est de commencer",
        ];
      }
      if (slot === "subheadline") {
        return [
          "Carnet, carte, envies : tout commence ici.",
          "Tu poses une idée, on construit le reste.",
          "Aucun plan, toutes les possibilités.",
        ];
      }
      return [];
    case "history_no_upcoming":
      if (slot === "headline") {
        return ["Envie de repartir ?", "La route t’appelle encore", "Le prochain peut commencer ici"];
      }
      if (slot === "subheadline") {
        return [
          `${ctx.firstName}, la route t’appelle encore.`,
          "Ton dernier voyage n’a pas vraiment fini de résonner.",
          "Tu connais déjà le goût du départ. Il ne reste qu’à relancer la machine.",
        ];
      }
      return ["Retour"];
    case "very_recent_return":
      if (slot === "headline") {
        return [
          "À peine rentré… déjà envie d’y retourner ?",
          "Le retour est encore tout frais",
          "On le revit ou on repart ?",
        ];
      }
      if (slot === "subheadline") {
        return [
          "Ton dernier Viago est encore chaud. On le revit ou on prépare le suivant ?",
          "Les souvenirs sont encore là. C’est le bon moment pour replonger.",
          "C’est encore tout frais. Un regard en arrière, ou déjà un nouvel élan ?",
        ];
      }
      return ["Retour récent"];
    case "upcoming_far":
      if (slot === "eyebrow") return ["Bientôt", "En préparation"];
      if (slot === "headline") return [ctx.nextTripName];
      if (slot === "subheadline") {
        return [
          `Départ dans ${ctx.daysUntilNextTripStart} jours. C’est loin, mais c’est déjà en route.`,
          `Ton voyage existe déjà. Il a encore le temps de mûrir.`,
          `Le départ est lointain, mais tu peux déjà lui donner du relief.`,
        ];
      }
      return [];
    case "upcoming_mid":
      if (slot === "eyebrow") return ["Bientôt", "Le départ approche"];
      if (slot === "headline") return [ctx.nextTripName];
      if (slot === "subheadline") {
        return [
          "Ton départ approche. C’est le bon moment pour affiner ton Viago.",
          "Le rêve devient concret. Quelques ajustements maintenant changent tout.",
          "Ça prend forme. Tu peux déjà lisser les détails qui comptent.",
        ];
      }
      return [];
    case "upcoming_soon":
      if (slot === "eyebrow") return ["Bientôt", "Compte à rebours"];
      if (slot === "headline") return [ctx.nextTripName];
      if (slot === "subheadline") {
        return [
          `Plus que ${ctx.daysUntilNextTripStart} jours avant le départ. Il est temps de tout caler.`,
          `Tu y es presque. On verrouille les derniers détails ?`,
          "Le départ devient réel. C’est le moment de passer en mode voyage.",
        ];
      }
      return [];
    case "depart_under_24h":
      if (slot === "eyebrow") return ["C’est pour demain", "Dernière ligne droite"];
      if (slot === "headline") return [ctx.nextTripName];
      if (slot === "subheadline") {
        return [
          "Dernière ligne droite : vérifie l’essentiel avant de partir.",
          "C’est presque l’heure. Un dernier check, puis place à la route.",
          "On est à la veille du départ. Ne garde que l’essentiel.",
        ];
      }
      return [];
    case "multiple_upcoming":
      if (slot === "eyebrow") return ["Prochain départ", "Plusieurs voyages t’attendent"];
      if (slot === "headline") return [ctx.nextTripName];
      if (slot === "subheadline") {
        return [
          `Tu as ${ctx.upcomingTripCount} voyages à venir. On commence par le plus proche.`,
          "Le prochain prend la main, mais les autres ne sont pas loin derrière.",
          "Ton calendrier commence à ressembler à quelque chose. On ouvre le plus proche ?",
        ];
      }
      return [];
    case "multiple_upcoming_conflict":
      if (slot === "eyebrow") return ["Attention", "Petit conflit à régler"];
      if (slot === "headline") {
        return ["Deux voyages se chevauchent", "Ton planning a besoin d’un arbitrage"];
      }
      if (slot === "subheadline") {
        return [
          "Tu ne pourras sans doute pas vivre les deux en même temps. Vérifie ton planning.",
          "L’un des voyages peut probablement passer en option pour clarifier la suite.",
          "Il y a un conflit de dates. Mieux vaut l’absorber maintenant que trop tard.",
        ];
      }
      return [];
    case "current_trip_shared":
    case "current_trip_solo":
      if (slot === "eyebrow") {
        if (ctx.openMoment === "morning") {
          return [scenarioId === "current_trip_shared" ? "En route ensemble" : "Bonjour la route"];
        }
        if (ctx.openMoment === "evening") {
          return [scenarioId === "current_trip_shared" ? "Encore ensemble ce soir" : "La journée retombe"];
        }
        return [scenarioId === "current_trip_shared" ? "En route ensemble" : "En route"];
      }
      if (slot === "headline") {
        return [
          ctx.currentTripName,
          ctx.openMoment === "evening" ? "La journée touche à sa fin" : ctx.currentTripName,
          ctx.openMoment === "morning" ? "Bonjour la route" : ctx.currentTripName,
        ];
      }
      if (slot === "subheadline") {
        if (ctx.openMoment === "evening") {
          return [
            `Aujourd’hui : ${ctx.currentStepName}. Ajoute une réflexion et jette un œil à demain.`,
            `Ta journée passe par ${ctx.currentStepName}. Le bon moment pour noter ce qui a compté.`,
            `Tu viens de vivre ${ctx.currentStepName}. On garde une trace et on regarde la suite ?`,
          ];
        }
        return [
          `Aujourd’hui : ${ctx.currentStepName}.`,
          `Ta journée s’ancre à ${ctx.currentStepName}.`,
          `Le voyage continue. Aujourd’hui, cap sur ${ctx.currentStepName}.`,
        ];
      }
      return [];
  }
}

function buildScenarioCopy(
  ctx: ScenarioContext,
  scenarioId: HomeScenarioId
): Pick<HomeScenarioViewModel, "eyebrow" | "headline" | "subheadline"> {
  const eyebrowPool = scenarioLabelPool(ctx, scenarioId, "eyebrow");
  const headlinePool = scenarioLabelPool(ctx, scenarioId, "headline");
  const subheadlinePool = scenarioLabelPool(ctx, scenarioId, "subheadline");

  return {
    eyebrow:
      eyebrowPool.length > 0
        ? pickDeterministic(eyebrowPool, scenarioSeed(ctx, scenarioId, "eyebrow"))
        : undefined,
    headline: pickDeterministic(
      headlinePool,
      scenarioSeed(ctx, scenarioId, "headline")
    ),
    subheadline: pickDeterministic(
      subheadlinePool,
      scenarioSeed(ctx, scenarioId, "subheadline")
    ),
  };
}

export function selectHomeScenarioId(
  state: VoyageStateResponse | null
): HomeScenarioId {
  if (state?.hasCurrentTrip || state?.etat === "voyage_en_cours") {
    return state?.isSharedTrip ? "current_trip_shared" : "current_trip_solo";
  }

  if (state?.hasUpcomingTrip || state?.etat === "voyage_prevu") {
    if ((state?.hoursUntilNextTripStart ?? Number.POSITIVE_INFINITY) < 24) {
      return "depart_under_24h";
    }
    if (state?.hasConflictingUpcomingTrips) {
      return "multiple_upcoming_conflict";
    }
    if (state?.hasMultipleUpcomingTrips) {
      return "multiple_upcoming";
    }
    if ((state?.joursRestants ?? 0) > 60) return "upcoming_far";
    if ((state?.joursRestants ?? 0) >= 15) return "upcoming_mid";
    return "upcoming_soon";
  }

  if (state?.hasPastTrip || state?.etat === "voyage_termine") {
    if ((state?.joursDepuisFinDernierVoyage ?? Number.POSITIVE_INFINITY) <= 3) {
      return "very_recent_return";
    }
    return "history_no_upcoming";
  }

  return "no_trip_ever";
}

export function computeDailyContentIds(profileId: string, date: Date = new Date()) {
  const dayKey = date.toISOString().slice(0, 10);
  const thought = pickDeterministic(DAILY_THOUGHTS, `${profileId}:${dayKey}:thought`);
  const editorial = pickDeterministic(
    DAILY_EDITORIAL_CARDS,
    `${profileId}:${dayKey}:editorial`
  );
  return {
    dailyThoughtId: thought.id,
    dailyEditorialCardId: editorial.id,
  };
}

export function buildAccueilViewModel({
  state,
  profileId,
  profileName,
}: {
  state: VoyageStateResponse | null;
  profileId: string;
  profileName: string;
}): HomeScenarioViewModel {
  const ctx = buildContext(state, profileId, profileName);
  const scenarioId = selectHomeScenarioId(state);
  const copy = buildScenarioCopy(ctx, scenarioId);
  const dailyThought = selectThought(state, profileId);
  const editorialCard = selectEditorialCard(state, profileId);

  switch (scenarioId) {
    case "no_trip_ever":
      return {
        scenarioId,
        layout: "standard",
        background: "video",
        ...copy,
        primaryCta: { label: "Trouver l’inspiration", href: "/inspirer", tone: "primary" },
        secondaryCta: {
          label: "Créer mon premier voyage",
          href: "/preparer",
          tone: "secondary",
        },
        dailyThought,
        editorialCard,
      };
    case "history_no_upcoming":
      return {
        scenarioId,
        layout: "standard",
        background: "return",
        ...copy,
        statusChip: `Dernier voyage il y a ${ctx.daysSinceLastTripEnd} jours`,
        primaryCta: { label: "Trouver l’inspiration", href: "/inspirer", tone: "primary" },
        secondaryCta: {
          label: "Revivre mon dernier voyage",
          href: state?.voyagesTermines?.[0] ? `/mon-espace/viago/${state.voyagesTermines[0].id}` : "/mon-espace",
          tone: "secondary",
        },
        dailyThought,
        editorialCard,
      };
    case "very_recent_return":
      return {
        scenarioId,
        layout: "standard",
        background: "return",
        ...copy,
        statusChip: `Retour il y a ${ctx.daysSinceLastTripEnd} jours`,
        primaryCta: {
          label: "Revoir mon dernier voyage",
          href: state?.voyagesTermines?.[0] ? `/mon-espace/viago/${state.voyagesTermines[0].id}` : "/mon-espace",
          tone: "primary",
        },
        secondaryCta: {
          label: "Trouver l’inspiration",
          href: "/inspirer",
          tone: "secondary",
        },
        dailyThought,
      };
    case "upcoming_far":
    case "upcoming_mid":
    case "upcoming_soon":
      return {
        scenarioId,
        layout: "standard",
        background: "video",
        ...copy,
        statusChip: `J-${ctx.daysUntilNextTripStart}`,
        primaryCta: {
          label: "Préparer ce voyage",
          href: state?.voyagePrevu ? `/mon-espace/voyage/${state.voyagePrevu.id}` : "/preparer",
          tone: "primary",
        },
        secondaryCta: {
          label: scenarioId === "upcoming_far" ? "Trouver l’inspiration" : "Voir les étapes",
          href:
            scenarioId === "upcoming_far"
              ? "/inspirer"
              : state?.voyagePrevu
                ? `/mon-espace/voyage/${state.voyagePrevu.id}`
                : "/preparer",
          tone: "secondary",
        },
        dailyThought,
        editorialCard,
      };
    case "depart_under_24h":
      return {
        scenarioId,
        layout: "standard",
        background: "video",
        ...copy,
        statusChip: "Départ dans moins de 24 h",
        primaryCta: {
          label: "Préparer ce voyage",
          href: state?.voyagePrevu ? `/mon-espace/voyage/${state.voyagePrevu.id}` : "/preparer",
          tone: "primary",
        },
        secondaryCta: {
          label: "Ouvrir ma checklist",
          href: state?.voyagePrevu ? `/mon-espace/voyage/${state.voyagePrevu.id}` : "/preparer",
          tone: "secondary",
        },
        dailyThought,
        gentleAlert: "Pense aux indispensables avant de boucler le départ.",
      };
    case "multiple_upcoming":
      return {
        scenarioId,
        layout: "standard",
        background: "video",
        ...copy,
        statusChip: `J-${ctx.daysUntilNextTripStart}`,
        primaryCta: {
          label: "Préparer ce voyage",
          href: state?.voyagesPrevus?.[0] ? `/mon-espace/voyage/${state.voyagesPrevus[0].id}` : "/preparer",
          tone: "primary",
        },
        secondaryCta: {
          label: "Voir tous mes voyages",
          href: "/mon-espace",
          tone: "secondary",
        },
        tripCard: {
          title: `${ctx.upcomingTripCount} voyages à venir`,
          detail:
            state?.voyagesPrevus?.[1]?.titre != null
              ? `Le prochain part d’abord, puis ${state.voyagesPrevus[1].titre} attend déjà son tour.`
              : "Le plus proche prend naturellement la main sur l’accueil.",
          badge: ctx.upcomingTripCount > 1 ? `+${ctx.upcomingTripCount - 1} autres` : undefined,
        },
        dailyThought,
      };
    case "multiple_upcoming_conflict":
      return {
        scenarioId,
        layout: "standard",
        background: "return",
        ...copy,
        primaryCta: {
          label: "Voir mes voyages",
          href: "/mon-espace",
          tone: "primary",
        },
        secondaryCta: {
          label: "Ajuster les dates",
          href: "/mon-espace",
          tone: "secondary",
        },
        gentleAlert: "L’un des voyages peut sans doute passer en option pour clarifier le planning.",
        tripCard: {
          title: `${ctx.upcomingTripCount} voyages à venir`,
          detail: "Le plus proche reste visible, mais un arbitrage de dates est devenu nécessaire.",
        },
        dailyThought,
      };
    case "current_trip_shared":
    case "current_trip_solo": {
      const voyageId = state?.voyageEnCours?.id;
      const morning = ctx.openMoment === "morning";
      const evening = ctx.openMoment === "evening";
      return {
        scenarioId,
        layout: "onTrip",
        background: "road",
        ...copy,
        statusChip: `Jour ${ctx.currentTripDayIndex} / ${ctx.currentTripTotalDays}`,
        primaryCta: {
          label: morning
            ? "Voir ma journée"
            : evening
              ? "Écrire ma réflexion du jour"
              : scenarioId === "current_trip_shared"
                ? "Reprendre notre voyage"
                : "Reprendre mon voyage",
          href: voyageId ? `/mon-espace/voyage/${voyageId}` : "/mon-espace",
          tone: "primary",
        },
        secondaryCta: {
          label: "Modifier en last minute",
          href: voyageId ? `/mon-espace/voyage/${voyageId}` : "/mon-espace",
          tone: "secondary",
        },
        dailyThought,
        daySheet: {
          title: ctx.currentStepName,
          subtitle: `Ensuite : ${ctx.nextStepName}`,
          notePrompt: evening
            ? "Ce que je retiens aujourd’hui"
            : "Ce qu’il ne faut pas oublier aujourd’hui",
          checklist: [
            "Jeter un oeil à l’étape suivante",
            "Garder une trace du moment du jour",
            "Adapter le trajet si quelque chose change en route",
          ],
        },
        gentleAlert:
          state?.hasLocationEnabled === false
            ? "Active la localisation pour affiner le Viago préparé autour de toi."
            : undefined,
      };
    }
  }
}
