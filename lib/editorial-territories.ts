import raw from "@/data/editorial-territories.json";

/** Géométrie carte Mapbox (fichier GeoJSON secteurs). */
export type MapInspirationGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type EditorialTerritory = {
  id: string;
  name: string;
  pitch: string;
  tags: string[];
  filter_tags: string[];
  duration_fit: string[];
  ideal_durations: number[];
  trip_styles: string[];
  poi_clusters: string[];
  markers: string[];
  center: [number, number];
  region_key: string;
  /** Région carte (groupe de départements, voir inspiration-map-regions-config). */
  poi_sector_id: string;
};

export type TerritoryFeatureProperties = {
  id: string;
  name: string;
  color?: string;
  /** Contour régional (palette marque, cycle orange / corail). */
  borderColor?: string;
};

type TerritoryFeature = {
  type: "Feature";
  properties: TerritoryFeatureProperties;
  geometry: MapInspirationGeometry;
};

export type TerritoriesFeatureCollection = {
  type: "FeatureCollection";
  features: TerritoryFeature[];
};

export type InspirationAmbianceFilter =
  | "mer"
  | "villages"
  | "nature"
  | "patrimoine"
  | "road_trip"
  | "moins_connu";

export type InspirationDurationFilter =
  | "weekend"
  | "week_5_7"
  | "one_two_weeks"
  | "long";

const ROOT = raw as { territories: EditorialTerritory[] };

export function listTerritories(): EditorialTerritory[] {
  return ROOT.territories;
}

export function getTerritoryById(id: string): EditorialTerritory | undefined {
  return ROOT.territories.find((t) => t.id === id);
}

export function filterTerritoriesByInspiration(
  territories: EditorialTerritory[],
  ambiance: InspirationAmbianceFilter[],
  duration: InspirationDurationFilter | null,
  poiSectorId: string | null
): EditorialTerritory[] {
  return territories.filter((t) => {
    if (poiSectorId && t.poi_sector_id !== poiSectorId) return false;
    if (ambiance.length > 0) {
      const ok = ambiance.every((a) => t.filter_tags.includes(a));
      if (!ok) return false;
    }
    if (duration && !t.duration_fit.includes(duration)) return false;
    return true;
  });
}

export const AMBIANCE_OPTIONS: { id: InspirationAmbianceFilter; label: string }[] = [
  { id: "mer", label: "Mer" },
  { id: "villages", label: "Villages" },
  { id: "nature", label: "Nature" },
  { id: "patrimoine", label: "Patrimoine" },
  { id: "road_trip", label: "Road trip" },
  { id: "moins_connu", label: "Moins connu" },
];

export const DURATION_OPTIONS: { id: InspirationDurationFilter; label: string }[] = [
  { id: "weekend", label: "Week-end" },
  { id: "week_5_7", label: "5 à 7 jours" },
  { id: "one_two_weeks", label: "1 à 2 semaines" },
  { id: "long", label: "Long voyage" },
];
