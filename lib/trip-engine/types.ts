export type SuggestMode = "zone" | "axis" | "places" | "inspiration";

export type Pace = "tranquille" | "equilibre" | "soutenu";

export type TripForm = "base_fixe" | "multi_bases" | "mobile" | "options";

export type Notoriety = "iconique" | "equilibre" | "moins_connu";

export interface SuggestInput {
  mode: SuggestMode;
  days: number;
  pace: Pace;
  tripForm: TripForm;
  notoriety: Notoriety;
  priorities: string[];
  /** Arbitrage si contradictions (ex. peu de route vs beaucoup à voir) */
  conflictPriority?: "densite" | "confort" | "ambiance" | "lieux_imposes";
  regionKey?: string;
  territoryId?: string;
  axis?: {
    startLabel: string;
    endLabel: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    corridorTendency: "direct" | "detours_legers" | "grands_detours" | "plusieurs";
    lateral?: "littoral" | "interieur" | "relief" | "aucune";
    routeVsDiscovery?: "moins_route" | "plus_voir" | "plus_temps" | "ambiance";
    corridorVariant?: string;
  };
  places?: Array<{
    id: string;
    label: string;
    lat: number;
    lng: number;
    weight: "hard" | "soft" | "bonus";
  }>;
}

export interface NightBase {
  name: string;
  lat: number;
  lng: number;
  nights: number;
}

export interface EnrichmentSegment {
  segmentIndex: number;
  label: string;
  pois: { name: string; reason: string }[];
}

export interface StructureOption {
  id: string;
  label: string;
  mobility: string;
  bases: NightBase[];
  explanations: string[];
  enrichments?: EnrichmentSegment[];
}

export interface SuggestResponse {
  structures: StructureOption[];
  meta?: {
    corridorLabel?: string;
    territoryHint?: string;
  };
}

export type PlaceDiagnosticLevel =
  | "faisable"
  | "compromis"
  | "ambitieux"
  | "deux_voyages";

export interface PlaceDiagnostic {
  level: PlaceDiagnosticLevel;
  title: string;
  detail: string;
  suggestedActions: { id: string; label: string }[];
}
