import type { Step } from "@/types";

const STORAGE_KEY = "viago-created-voyages";

export type CreatedVoyageStep = {
  id: string;
  nom: string;
  type: "nuit" | "passage";
  date_prevue?: string;
  lat?: number;
  lng?: number;
  /** Nombre de nuits passées dans cette étape (0 pour un passage). */
  nights?: number;
  /** Budget par ville (en euros, tous optionnels). */
  budgetNourriture?: number;
  budgetCulture?: number;
  budgetLogement?: number;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type CreatedVoyage = {
  id: string;
  titre: string;
  sousTitre: string;
  createdAt: string;
  /** Date de départ du voyage (YYYY-MM-DD) — ancre pour les étapes. */
  dateDebut?: string;
  steps: CreatedVoyageStep[];
  /** Tracé routier Mapbox (GeoJSON), si calculé. */
  routeGeometry?: RouteGeometry | null;
  /** Distance / durée totales de l’itinéraire routier. */
  stats?: { totalKm: number; totalMin: number };
  /** Un segment par paire d’étapes consécutives (même ordre que les étapes). */
  legs?: Array<{ distanceKm: number; durationMin: number }>;
};

export function getCreatedVoyageById(id: string): CreatedVoyage | null {
  return loadCreatedVoyages().find((v) => v.id === id) ?? null;
}

/** Payload attendu par ViagoPageClient (étapes complètes pour le récit). */
export function createdVoyageToViagoPayload(cv: CreatedVoyage): {
  id: string;
  titre: string;
  sousTitre?: string;
  steps: Step[];
  stats?: { km?: number; essence?: number; budget?: number };
} {
  const steps: Step[] = cv.steps.map((s) => {
    const lat = s.lat ?? 46.2276;
    const lng = s.lng ?? 2.2137;
    const budget =
      (s.budgetNourriture ?? 0) +
      (s.budgetCulture ?? 0) +
      (s.budgetLogement ?? 0);
    return {
      id: s.id,
      nom: s.nom,
      coordonnees: { lat, lng },
      date_prevue: s.date_prevue ?? new Date().toISOString().slice(0, 10),
      date_depart: null,
      description_culture: "",
      budget_prevu: budget,
      nuitee_type: s.type === "passage" ? "passage" : "van",
      contenu_voyage: { photos: [] },
    };
  });
  return {
    id: cv.id,
    titre: cv.titre,
    sousTitre: cv.sousTitre,
    steps,
    stats: cv.stats?.totalKm
      ? {
          km: cv.stats.totalKm,
          essence: Math.round(cv.stats.totalKm * 0.12),
          budget: undefined,
        }
      : undefined,
  };
}

export function loadCreatedVoyages(): CreatedVoyage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCreatedVoyage(voyage: CreatedVoyage): void {
  if (typeof window === "undefined") return;
  const existing = loadCreatedVoyages();
  existing.unshift(voyage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Remplace ou insère un voyage par `id` (mise à jour idempotente). */
export function upsertCreatedVoyage(voyage: CreatedVoyage): void {
  if (typeof window === "undefined") return;
  const rest = loadCreatedVoyages().filter((v) => v.id !== voyage.id);
  rest.unshift(voyage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

/** Recalcule `date_prevue` à partir de `dateDebut` et des nuits par étape (logique alignée sur Préparer). */
export function recomputeCreatedStepDates(
  steps: CreatedVoyageStep[],
  dateDebut: string
): CreatedVoyageStep[] {
  const start = new Date(dateDebut);
  if (Number.isNaN(start.getTime())) return steps;
  let cursor = 0;
  return steps.map((s) => {
    const d = new Date(start.getTime() + cursor * 86400000);
    const iso = d.toISOString().split("T")[0];
    const advance = s.type === "nuit" ? Math.max(1, s.nights ?? 1) : 0;
    cursor += advance;
    return { ...s, date_prevue: iso };
  });
}

export function removeCreatedVoyage(id: string): void {
  if (typeof window === "undefined") return;
  const existing = loadCreatedVoyages().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
