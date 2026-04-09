/**
 * Persistance locale des modifications d'itinéraire (ordre, nuitées, étapes retirées).
 * À remplacer par une API quand le backend sera prêt.
 */

export type NuiteeOverride = "van" | "passage" | "airbnb";

/** Étape ajoutée localement (pas dans le voyage API d’origine) */
export type CustomItineraireStep = {
  id: string;
  nom: string;
  lat: number;
  lng: number;
  date_prevue?: string;
  nuitee_type?: NuiteeOverride;
  nuitees?: number;
  contenu_voyage?: { photos?: string[] };
};

export interface VoyageItineraireOverride {
  /** IDs des étapes dans l'ordre souhaité (les absentes du voyage d'origine sont ignorées) */
  order: string[];
  /** IDs des étapes masquées / retirées de l'itinéraire */
  removed: string[];
  /** Type de nuitée par étape */
  nuiteeByStepId: Record<string, NuiteeOverride>;
  /** Nombre de nuitées par étape (override) */
  nuiteesByStepId?: Record<string, number>;
  /** Étapes créées sur l’appareil (id souvent `custom-…`) */
  customStepsById?: Record<string, CustomItineraireStep>;
}

const key = (voyageId: string) => `voyage_itineraire_${voyageId}`;

export function loadItineraireOverride(
  voyageId: string
): VoyageItineraireOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(voyageId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<VoyageItineraireOverride>;
    return {
      order: Array.isArray(p.order) ? p.order : [],
      removed: Array.isArray(p.removed) ? p.removed : [],
      nuiteeByStepId:
        p.nuiteeByStepId && typeof p.nuiteeByStepId === "object"
          ? p.nuiteeByStepId
          : {},
      nuiteesByStepId:
        p.nuiteesByStepId && typeof p.nuiteesByStepId === "object"
          ? p.nuiteesByStepId
          : {},
      customStepsById:
        p.customStepsById && typeof p.customStepsById === "object"
          ? p.customStepsById
          : {},
    };
  } catch {
    return null;
  }
}

export function saveItineraireOverride(
  voyageId: string,
  data: VoyageItineraireOverride
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(voyageId), JSON.stringify(data));
}

export function clearItineraireOverride(voyageId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(voyageId));
}

function applyStepOverrides<T extends { id: string; nuitee_type?: string | null; nuitees?: number }>(
  s: T,
  ov: VoyageItineraireOverride
): T {
  const n = ov.nuiteeByStepId[s.id];
  if (n) (s as { nuitee_type?: string }).nuitee_type = n;
  const nn = ov.nuiteesByStepId?.[s.id];
  if (nn != null && nn >= 0) (s as { nuitees?: number }).nuitees = nn;
  return s;
}

function customToBaselineRow<T>(c: CustomItineraireStep): T {
  return {
    id: c.id,
    nom: c.nom,
    date_prevue: c.date_prevue,
    nuitee_type: c.nuitee_type ?? "van",
    nuitees: c.nuitees,
    coordonnees: { lat: c.lat, lng: c.lng },
    contenu_voyage: c.contenu_voyage ?? { photos: [] },
    description_culture: "",
    budget_prevu: 0,
  } as unknown as T;
}

/** Fusionne le voyage API avec les overrides locaux */
export function mergeVoyageSteps<
  T extends {
    id: string;
    nuitee_type?: string | null;
    nuitees?: number;
    coordonnees?: { lat: number; lng: number };
  },
>(steps: T[], voyageId: string): T[] {
  const ov = loadItineraireOverride(voyageId);
  if (!ov) return steps;

  const removed = new Set(ov.removed);
  const kept = steps.filter((s) => !removed.has(s.id));
  const byId = new Map(kept.map((s) => [s.id, { ...s } as T]));

  const custom = ov.customStepsById ?? {};
  for (const [cid, c] of Object.entries(custom)) {
    if (!byId.has(cid) && !removed.has(cid)) {
      byId.set(cid, customToBaselineRow<T>(c));
    }
  }

  const seen = new Set<string>();
  const result: T[] = [];

  for (const id of ov.order) {
    const s = byId.get(id);
    if (s && !seen.has(id)) {
      result.push(applyStepOverrides({ ...s } as T, ov));
      seen.add(id);
    }
  }
  for (const s of kept) {
    if (!seen.has(s.id)) {
      result.push(applyStepOverrides({ ...s }, ov));
    }
  }

  return result;
}
