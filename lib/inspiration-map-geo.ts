import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { EditorialTerritory } from "@/lib/editorial-territories";
import type { TerritoriesFeatureCollection } from "@/lib/editorial-territories";
import type { StarItineraryContent } from "@/types/inspiration";

export function bboxFromLineString(ls: LineString): [number, number, number, number] {
  const b = turf.bbox({ type: "Feature", properties: {}, geometry: ls });
  return [b[0], b[1], b[2], b[3]];
}

/** Métropole + Corse (exclut outre-mer accidentellement fusionné dans un polygone). */
const FR_MAINLAND_BOUNDS = {
  minLng: -5.5,
  maxLng: 10,
  minLat: 41,
  maxLat: 51.5,
};

function collectCoordsInFrance(geom: { coordinates: unknown }): [number, number][] {
  const out: [number, number][] = [];
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      const lng = c[0];
      const lat = c[1];
      if (
        lng >= FR_MAINLAND_BOUNDS.minLng &&
        lng <= FR_MAINLAND_BOUNDS.maxLng &&
        lat >= FR_MAINLAND_BOUNDS.minLat &&
        lat <= FR_MAINLAND_BOUNDS.maxLat
      ) {
        out.push([lng, lat]);
      }
      return;
    }
    for (const x of c) walk(x);
  };
  walk(geom.coordinates);
  return out;
}

export function bboxForRegionFeature(
  sectorsFc: TerritoriesFeatureCollection,
  regionId: string
): [number, number, number, number] | null {
  const f = sectorsFc.features.find((x) => x.properties?.id === regionId);
  if (!f?.geometry) return null;

  const pts = collectCoordsInFrance(f.geometry as { coordinates: unknown });
  if (pts.length < 2) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of pts) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  const pad = 0.06;
  return [minLng - pad, minLat - pad, maxLng + pad, maxLat + pad];
}

export function territoriesToPointCollection(
  territories: EditorialTerritory[],
  regionId: string | null
): FeatureCollection<Point> {
  const list = regionId
    ? territories.filter((t) => t.poi_sector_id === regionId)
    : territories;
  return {
    type: "FeatureCollection",
    features: list.map((t) => ({
      type: "Feature" as const,
      properties: { id: t.id, name: t.name },
      geometry: {
        type: "Point" as const,
        coordinates: t.center,
      },
    })),
  };
}

export type LieuPoiTier = "strong" | "standard" | "saved";

export type SlimLieuPoint = {
  slug: string;
  nom: string;
  lat: number;
  lng: number;
  source_type?: string;
  tier?: LieuPoiTier;
};

export function lieuxToPointCollection(lieux: SlimLieuPoint[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: lieux.map((l) => ({
      type: "Feature" as const,
      properties: {
        id: l.slug,
        /** Nom affiché (étiquettes carte, panneau sélection). */
        name: l.nom,
        kind: "ville",
        source_type: l.source_type ?? "",
        tier: l.tier ?? "standard",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [l.lng, l.lat],
      },
    })),
  };
}

export function starItinerariesToLineCollection(
  items: StarItineraryContent[],
  highlightId: string | null
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((s) => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        hl: highlightId === s.id ? 1 : 0,
      },
      geometry: s.geometry,
    })),
  };
}
