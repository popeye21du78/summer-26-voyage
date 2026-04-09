const STORAGE_KEY = "planifier-draft-v1";

export type PlanifierMode = "inspiration" | "zone" | "axis" | "places";

export type TripDraft = {
  mode: PlanifierMode;
  updatedAt: string;
  fromTerritoryId?: string;
  zone?: {
    regionKey: string;
    regionLabel: string;
    searchQuery?: string;
    days: number;
    pace: "tranquille" | "equilibre" | "soutenu";
    priorities: string[];
    notoriety: "iconique" | "equilibre" | "moins_connu";
    tripForm: "base_fixe" | "multi_bases" | "mobile" | "options";
    conflictPriority?: "densite" | "confort" | "ambiance" | "lieux_imposes";
  };
  axis?: {
    startLabel: string;
    endLabel: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    returnToStart: boolean;
    days: number;
    corridorTendency: "direct" | "detours_legers" | "grands_detours" | "plusieurs";
    lateral?: "littoral" | "interieur" | "relief" | "aucune";
    priorities: string[];
    notoriety: "iconique" | "equilibre" | "moins_connu";
    routeVsDiscovery: "moins_route" | "plus_voir" | "plus_temps" | "ambiance";
    corridorVariant?: string;
  };
  places?: {
    items: Array<{
      id: string;
      label: string;
      lat: number;
      lng: number;
      weight: "hard" | "soft" | "bonus";
    }>;
    startLabel?: string;
    endLabel?: string;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
    returnToStart: boolean;
    days: number;
    treatmentChoice?: string;
  };
};

export function loadTripDraft(): TripDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as TripDraft;
    if (!parsed?.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTripDraft(draft: TripDraft): void {
  if (typeof window === "undefined") return;
  draft.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearTripDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function mergeTerritoryIntoDraft(
  territoryId: string,
  regionKey: string,
  territoryName?: string
): TripDraft {
  const prev = loadTripDraft();
  const draft: TripDraft = {
    mode: "zone",
    updatedAt: new Date().toISOString(),
    fromTerritoryId: territoryId,
    zone: {
      regionKey,
      regionLabel: territoryName ?? territoryId,
      days: prev?.zone?.days ?? 7,
      pace: prev?.zone?.pace ?? "equilibre",
      priorities: prev?.zone?.priorities ?? [],
      notoriety: prev?.zone?.notoriety ?? "equilibre",
      tripForm: prev?.zone?.tripForm ?? "options",
    },
  };
  saveTripDraft(draft);
  return draft;
}
