/**
 * Voyages préfaits et voyages par persona pour la simulation.
 * Photos Unsplash (Provence, Châteaux cathares, van-life).
 */

import type { Step } from "../types";

/** État d'un voyage pour un profil */
export type EtatVoyage = "voyage_prevu" | "voyage_en_cours" | "voyage_termine" | "rien";

/** Voyage complet avec métadonnées */
export interface Voyage {
  id: string;
  titre: string;
  sousTitre: string;
  region: string;
  dureeJours: number;
  /** Voyage solo / partagé (utilisé par l’accueil dynamique). */
  estPartage?: boolean;
  /** Date de début (YYYY-MM-DD) — calculée dynamiquement selon persona */
  dateDebut: string;
  steps: Step[];
  /** Stats optionnelles (km, essence, budget) */
  stats?: { km?: number; essence?: number; budget?: number };
  /** Tracé routier (Mapbox), pour les voyages créés côté client. */
  routeGeometry?: { type: "LineString"; coordinates: [number, number][] } | null;
  /** Segments routiers entre étapes (km, min), alignés sur l’ordre des étapes. */
  routeLegs?: Array<{ distanceKm: number; durationMin: number }>;
  /** Profil de calcul d’itinéraire (carnet créé côté client). */
  routeProfile?: "driving" | "cycling";
}

/** Crée des steps à partir d'un template avec photos Unsplash */
function createSteps(
  template: Array<{
    id: string;
    nom: string;
    lat: number;
    lng: number;
    dateOffset: number;
    description: string;
    photos: string[];
    anecdote?: string;
  }>,
  dateDebut: string
): Step[] {
  const base = new Date(dateDebut);
  return template.map((t) => {
    const d = new Date(base);
    d.setDate(d.getDate() + t.dateOffset);
    const datePrevue = d.toISOString().slice(0, 10);
    const d2 = new Date(d);
    d2.setDate(d2.getDate() + 1);
    const dateDepart = d2.toISOString().slice(0, 10);
    return {
      id: t.id,
      nom: t.nom,
      coordonnees: { lat: t.lat, lng: t.lng },
      date_prevue: datePrevue,
      date_depart: dateDepart,
      nuitees: 1,
      description_culture: t.description,
      budget_prevu: 80,
      nuitee_type: "van" as const,
      budget_culture: 30,
      budget_nourriture: 50,
      contenu_voyage: {
        photos: t.photos,
        anecdote: t.anecdote,
      },
    };
  });
}

// ——— Provence ———
const PROVENCE_TEMPLATE = [
  {
    id: "avignon",
    nom: "Avignon",
    lat: 43.9493,
    lng: 4.8055,
    dateOffset: 0,
    description:
      "Cité des Papes, palais gothique et pont légendaire. Le soir, les terrasses du centre vibrent jusqu'à tard.",
    photos: [
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
      "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800",
    ],
    anecdote: "Le Palais des Papes vu du Rocher des Doms au coucher du soleil.",
  },
  {
    id: "gordes",
    nom: "Gordes",
    lat: 43.9117,
    lng: 5.2011,
    dateOffset: 1,
    description:
      "Village perché parmi les plus beaux de France. Pierres dorées, lavande et oliviers à perte de vue.",
    photos: [
      "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    ],
    anecdote: "Petit-déj face au Luberon, le van garé sur une colline déserte.",
  },
  {
    id: "roussillon",
    nom: "Roussillon",
    lat: 43.9022,
    lng: 5.2922,
    dateOffset: 2,
    description:
      "Ocre rouge et falaises sculptées. Sentier des ocres incontournable, lumière magique en fin de journée.",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
      "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800",
    ],
    anecdote: "Les ocres au soleil, on se croirait dans le Colorado.",
  },
  {
    id: "cassis",
    nom: "Cassis",
    lat: 43.2157,
    lng: 5.5386,
    dateOffset: 3,
    description:
      "Port de pêche, calanques et falaises blanches. Une baignade aux calanques vaut le détour.",
    photos: [
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    ],
    anecdote: "Calanque d'En-Vau : eau turquoise et rochers blancs. Paradis.",
  },
  {
    id: "marseille",
    nom: "Marseille",
    lat: 43.2965,
    lng: 5.3698,
    dateOffset: 4,
    description:
      "Vieux-Port, panier, MuCEM. Une ville méditerranéenne brute et généreuse.",
    photos: [
      "https://images.unsplash.com/photo-1578645510447-e2b6914c1d70?w=800",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    ],
    anecdote: "Bouillabaisse au Vieux-Port, le van garé sur les hauteurs.",
  },
];

// ——— Châteaux cathares ———
const CHATEAUX_CATHARES_TEMPLATE = [
  {
    id: "carcassonne",
    nom: "Carcassonne",
    lat: 43.2122,
    lng: 2.3636,
    dateOffset: 0,
    description:
      "Cité médiévale fortifiée, la plus grande d'Europe. Remparts, château comtal et vue sur la plaine.",
    photos: [
      "https://images.unsplash.com/photo-1549140602-2a56a713256e?w=800",
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800",
    ],
    anecdote: "La Cité au crépuscule, presque vide. Magique.",
  },
  {
    id: "minerve",
    nom: "Minerve",
    lat: 43.3542,
    lng: 2.7444,
    dateOffset: 1,
    description:
      "Village perché dans les gorges de la Cesse. Bastide cathare, pont naturel et vignobles.",
    photos: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
    ],
    anecdote: "Le pont naturel, on s'est assis là une heure à regarder l'eau.",
  },
  {
    id: "queribus",
    nom: "Château de Quéribus",
    lat: 42.8372,
    lng: 2.6214,
    dateOffset: 2,
    description:
      "Forteresse perchée à 728 m. Dernier bastion cathare, vue à 360° sur les Corbières.",
    photos: [
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    ],
    anecdote: "Montée à pied, le vent soufflait fort. On a cru toucher le ciel.",
  },
  {
    id: "puilaurens",
    nom: "Château de Puilaurens",
    lat: 42.8056,
    lng: 2.2989,
    dateOffset: 3,
    description:
      "Citadelle du vertige dans la forêt. Une des plus belles ruines cathares.",
    photos: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
    ],
    anecdote: "La forêt autour, le silence. On a dormi au pied du château.",
  },
  {
    id: "montsegur",
    nom: "Montségur",
    lat: 42.8758,
    lng: 1.8322,
    dateOffset: 4,
    description:
      "Pog des cathares. Le dernier refuge avant le bûcher. Montée émouvante.",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
      "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800",
    ],
    anecdote: "En haut, le vent. On a pensé à ceux qui sont morts pour leurs idées.",
  },
  {
    id: "foix",
    nom: "Foix",
    lat: 42.9606,
    lng: 1.6072,
    dateOffset: 5,
    description:
      "Château des comtes de Foix, ville au pied des Pyrénées. Fin de route cathare.",
    photos: [
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
    ],
    anecdote: "Bières locales et vue sur le château. Belle fin de voyage.",
  },
];

// ——— Châteaux de la Loire (4j) ———
const LOIRE_TEMPLATE = [
  { id: "blois", nom: "Blois", lat: 47.5861, lng: 1.3359, dateOffset: 0, description: "Château royal et vieille ville.", photos: ["https://images.unsplash.com/photo-1549140602-2a56a713256e?w=800", "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800"], anecdote: "" },
  { id: "chambord", nom: "Chambord", lat: 47.6164, lng: 1.5172, dateOffset: 1, description: "Le plus majestueux des châteaux de la Loire.", photos: ["https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800"], anecdote: "" },
  { id: "chenonceau", nom: "Chenonceau", lat: 47.3249, lng: 1.0692, dateOffset: 2, description: "Château des Dames, enjambant le Cher.", photos: ["https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"], anecdote: "" },
  { id: "amboise", nom: "Amboise", lat: 47.4124, lng: 0.9845, dateOffset: 3, description: "Ville royale et Clos Lucé.", photos: ["https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800", "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800"], anecdote: "" },
];

// ——— Bretagne nord (4j) ———
const BRETAGNE_TEMPLATE = [
  { id: "saint-malo", nom: "Saint-Malo", lat: 48.6493, lng: -2.0257, dateOffset: 0, description: "Cité corsaire et remparts.", photos: ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"], anecdote: "" },
  { id: "cap-frehel", nom: "Cap Fréhel", lat: 48.6833, lng: -2.3167, dateOffset: 1, description: "Falaises sauvages et phare.", photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800"], anecdote: "" },
  { id: "dinan", nom: "Dinan", lat: 48.4516, lng: -2.0503, dateOffset: 2, description: "Ville médiévale et remparts.", photos: ["https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800", "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800"], anecdote: "" },
  { id: "perros", nom: "Perros-Guirec", lat: 48.8142, lng: -3.4450, dateOffset: 3, description: "Côte de granit rose.", photos: ["https://images.unsplash.com/photo-1578645510447-e2b6914c1d70?w=800", "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"], anecdote: "" },
];

// ——— Côte d'Azur (4j) ———
const COTE_AZUR_TEMPLATE = [
  { id: "nice", nom: "Nice", lat: 43.7102, lng: 7.2620, dateOffset: 0, description: "Promenade des Anglais et vieille ville.", photos: ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"], anecdote: "" },
  { id: "antibes", nom: "Antibes", lat: 43.5804, lng: 7.1251, dateOffset: 1, description: "Cap d'Antibes et Picasso.", photos: ["https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"], anecdote: "" },
  { id: "cannes", nom: "Cannes", lat: 43.5528, lng: 7.0174, dateOffset: 2, description: "Croisette et îles de Lérins.", photos: ["https://images.unsplash.com/photo-1578645510447-e2b6914c1d70?w=800", "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"], anecdote: "" },
  { id: "menton", nom: "Menton", lat: 43.7735, lng: 7.5041, dateOffset: 3, description: "Ville des citrons et frontière.", photos: ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800"], anecdote: "" },
];

/** Génère la date de début selon le décalage en jours (négatif = dans le passé) */
function dateFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Jours calendaires jusqu’à une date ISO (min 0 si déjà passée, arrondi). */
export function joursJusquau(dateIso: string): number {
  const cible = new Date(dateIso + "T12:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  cible.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((cible.getTime() - now.getTime()) / 86400000));
}

/** État persona enrichi (plusieurs voyages prévus possibles). */
export type PersonaVoyageState = {
  etat: EtatVoyage;
  voyageEnCours?: Voyage;
  voyagePrevu?: Voyage;
  /** Tous les voyages à venir (triés : le premier = prochain). Si absent, seul voyagePrevu compte. */
  voyagesPrevus?: Voyage[];
  voyagesTermines?: Voyage[];
  jourActuel?: number;
  joursRestants?: number;
};

/** Tous les voyages « perso » d’un état persona (prévus multiples inclus, sans doublon d’id). */
export function collectPersonaVoyages(state: PersonaVoyageState): Voyage[] {
  const prevusRaw =
    state.voyagesPrevus && state.voyagesPrevus.length > 0
      ? state.voyagesPrevus
      : state.voyagePrevu
        ? [state.voyagePrevu]
        : [];
  const seen = new Set<string>();
  const prevus = prevusRaw.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
  return [
    state.voyageEnCours,
    ...prevus,
    ...(state.voyagesTermines ?? []),
  ].filter(Boolean) as Voyage[];
}

/** Voyages préfaits (inspiration) */
export const VOYAGES_PREFAITS: Voyage[] = [
  {
    id: "provence-5j",
    titre: "Provence en 5 jours",
    sousTitre: "Avignon → Marseille",
    region: "Provence",
    dureeJours: 5,
    dateDebut: dateFromToday(7), // exemple
    steps: createSteps(PROVENCE_TEMPLATE, dateFromToday(7)),
    stats: { km: 420, essence: 45, budget: 380 },
  },
  {
    id: "chateaux-cathares-6j",
    titre: "Châteaux cathares",
    sousTitre: "Carcassonne → Foix",
    region: "Occitanie",
    dureeJours: 6,
    dateDebut: dateFromToday(14),
    steps: createSteps(CHATEAUX_CATHARES_TEMPLATE, dateFromToday(14)),
    stats: { km: 380, essence: 40, budget: 320 },
  },
  {
    id: "loire-4j",
    titre: "Châteaux de la Loire",
    sousTitre: "Blois → Amboise",
    region: "Centre",
    dureeJours: 4,
    dateDebut: dateFromToday(21),
    steps: createSteps(LOIRE_TEMPLATE, dateFromToday(21)),
    stats: { km: 180, essence: 25, budget: 280 },
  },
  {
    id: "bretagne-4j",
    titre: "Bretagne nord",
    sousTitre: "Saint-Malo → Perros",
    region: "Bretagne",
    dureeJours: 4,
    dateDebut: dateFromToday(28),
    steps: createSteps(BRETAGNE_TEMPLATE, dateFromToday(28)),
    stats: { km: 220, essence: 30, budget: 260 },
  },
  {
    id: "cote-azur-4j",
    titre: "Côte d'Azur",
    sousTitre: "Nice → Menton",
    region: "PACA",
    dureeJours: 4,
    dateDebut: dateFromToday(35),
    steps: createSteps(COTE_AZUR_TEMPLATE, dateFromToday(35)),
    stats: { km: 120, essence: 20, budget: 350 },
  },
];

/** Étapes du 1er voyage préfait (hero accueil) — référence stable pour /api/photo-lieu-batch. */
export const HERO_ACCUEIL_STEP_REFS: { id: string; nom: string }[] =
  VOYAGES_PREFAITS[0]?.steps.map((s) => ({ id: s.id, nom: s.nom })) ?? [];

const TEMPLATE_MAP: Record<string, typeof PROVENCE_TEMPLATE> = {
  "provence-5j": PROVENCE_TEMPLATE,
  "chateaux-cathares-6j": CHATEAUX_CATHARES_TEMPLATE,
  "loire-4j": LOIRE_TEMPLATE,
  "bretagne-4j": BRETAGNE_TEMPLATE,
  "cote-azur-4j": COTE_AZUR_TEMPLATE,
};

/** Voyage avec date calculée */
export function getVoyagePrefait(id: string, dateDebut: string): Voyage | null {
  const v = VOYAGES_PREFAITS.find((x) => x.id === id);
  if (!v) return null;
  const template = TEMPLATE_MAP[id];
  if (!template) return null;
  return {
    ...v,
    dateDebut,
    steps: createSteps(template, dateDebut),
  };
}

/** Voyages par persona — dates simulées. IDs uniques pour les URLs. */
export function getVoyageForProfile(profileId: string): PersonaVoyageState {
  switch (profileId) {
    case "marc": {
      const dateDebut = dateFromToday(3);
      const v = getVoyagePrefait("provence-5j", dateDebut)!;
      const voyage = { ...v, id: "marc-provence" };
      return {
        etat: "voyage_prevu",
        voyagePrevu: voyage,
        voyagesPrevus: [voyage],
        joursRestants: joursJusquau(dateDebut),
      };
    }
    case "sophie": {
      const dateDebut = dateFromToday(-2);
      const v = getVoyagePrefait("chateaux-cathares-6j", dateDebut)!;
      const voyage = { ...v, id: "sophie-chateaux" };
      return {
        etat: "voyage_en_cours",
        voyageEnCours: voyage,
        jourActuel: 3,
        joursRestants: 4,
      };
    }
    case "lea": {
      const date1 = dateFromToday(12);
      const date2 = dateFromToday(28);
      const raw1 = getVoyagePrefait("provence-5j", date1)!;
      const raw2 = getVoyagePrefait("bretagne-4j", date2)!;
      const voyage1 = { ...raw1, id: "lea-provence-prevu" };
      const voyage2 = { ...raw2, id: "lea-bretagne-prevu" };
      return {
        etat: "voyage_prevu",
        voyagePrevu: voyage1,
        voyagesPrevus: [voyage1, voyage2],
        joursRestants: joursJusquau(date1),
      };
    }
    case "thomas": {
      const dateDebut = dateFromToday(-45);
      const v = getVoyagePrefait("provence-5j", dateDebut)!;
      return {
        etat: "voyage_termine",
        voyagesTermines: [{ ...v, id: "thomas-provence" }],
      };
    }
    case "eva-viago": {
      const d = dateFromToday(-120);
      const v = getVoyagePrefait("provence-5j", d)!;
      return {
        etat: "voyage_termine",
        voyagesTermines: [{ ...v, id: "eva-provence-edito" }],
      };
    }
    case "matteo-horizons": {
      const d = dateFromToday(-200);
      const v = getVoyagePrefait("chateaux-cathares-6j", d)!;
      return {
        etat: "voyage_termine",
        voyagesTermines: [{ ...v, id: "matteo-cathares-edito" }],
      };
    }
    case "lina-routes": {
      const d = dateFromToday(-60);
      const v = getVoyagePrefait("bretagne-4j", d)!;
      return {
        etat: "voyage_termine",
        voyagesTermines: [{ ...v, id: "lina-bretagne-edito" }],
      };
    }
    case "julie": {
      return { etat: "rien" };
    }
    default: {
      /** Compte e-mail (Supabase) : on réutilise une persona démo pour l’existant. */
      if (/^[0-9a-f-]{36}$/i.test(profileId)) {
        return getVoyageForProfile("sophie");
      }
      return { etat: "rien" };
    }
  }
}

/** Récupère un voyage par ID (pour les pages détaillées). Inclut les voyages des amis si friendIds fourni. */
export function getVoyageById(
  voyageId: string,
  profileId: string,
  friendIds?: string[]
): Voyage | null {
  const state = getVoyageForProfile(profileId);
  const all = collectPersonaVoyages(state);
  const mine = all.find((v) => v.id === voyageId);
  if (mine) return mine;
  if (friendIds) {
    for (const fid of friendIds) {
      const s = getVoyageForProfile(fid);
      const amiAll = collectPersonaVoyages(s);
      const ami = amiAll.find((v) => v.id === voyageId);
      if (ami) return ami;
    }
  }
  return null;
}

/** Récupère un voyage avec infos propriétaire (pour distinguer mon voyage vs ami). */
export function getVoyageWithOwner(
  voyageId: string,
  profileId: string,
  friendIds?: string[]
): { voyage: Voyage; isOwner: boolean; ownerProfileId?: string } | null {
  const state = getVoyageForProfile(profileId);
  const all = collectPersonaVoyages(state);
  const mine = all.find((v) => v.id === voyageId);
  if (mine) return { voyage: mine, isOwner: true };
  if (friendIds) {
    for (const fid of friendIds) {
      const s = getVoyageForProfile(fid);
      const amiAll = collectPersonaVoyages(s);
      const ami = amiAll.find((v) => v.id === voyageId);
      if (ami) return { voyage: ami, isOwner: false, ownerProfileId: fid };
    }
  }
  return null;
}

/** Steps du voyage en cours pour un profil */
export function getStepsForProfile(profileId: string): Step[] {
  const state = getVoyageForProfile(profileId);
  const { voyageEnCours, voyagePrevu, voyagesPrevus, voyagesTermines } = state;
  const premierPrevu = voyagesPrevus?.[0] ?? voyagePrevu;
  const v = voyageEnCours ?? premierPrevu ?? voyagesTermines?.[0];
  return v?.steps ?? [];
}

/** Steps du jour N pour un voyage */
export function getStepsOfDay(voyage: Voyage, dayIndex: number): Step[] {
  const start = new Date(voyage.dateDebut);
  const target = new Date(start);
  target.setDate(target.getDate() + dayIndex);
  const targetStr = target.toISOString().slice(0, 10);
  return voyage.steps.filter((s) => s.date_prevue === targetStr);
}
