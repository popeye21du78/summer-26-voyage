import type { Step } from "@/types";

const STORAGE_KEY = "viago-created-voyages";

export type CreatedVoyage = {
  id: string;
  titre: string;
  sousTitre: string;
  createdAt: string;
  steps: Array<{
    id: string;
    nom: string;
    type: "nuit" | "passage";
    date_prevue?: string;
    lat?: number;
    lng?: number;
  }>;
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
  const steps: Step[] = cv.steps.map((s, i) => {
    const lat = s.lat ?? 46.2276;
    const lng = s.lng ?? 2.2137;
    return {
      id: s.id,
      nom: s.nom,
      coordonnees: { lat, lng },
      date_prevue: s.date_prevue ?? new Date().toISOString().slice(0, 10),
      date_depart: null,
      description_culture: "",
      budget_prevu: 0,
      nuitee_type: s.type === "passage" ? "passage" : "van",
      contenu_voyage: { photos: [] },
    };
  });
  return {
    id: cv.id,
    titre: cv.titre,
    sousTitre: cv.sousTitre,
    steps,
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

export function removeCreatedVoyage(id: string): void {
  if (typeof window === "undefined") return;
  const existing = loadCreatedVoyages().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
