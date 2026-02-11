import * as turf from "@turf/turf";
import type { Step } from "../types";
import { getPeage } from "../data/peages";

/** Vitesse moyenne estimée (km/h) pour le calcul de la durée */
const VITESSE_MOYENNE_KMH = 85;

export type SegmentProperties = {
  segmentId: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  durationMin: number;
  tollCost: number;
};

export type RouteSegmentFeature = GeoJSON.Feature<
  GeoJSON.LineString,
  SegmentProperties
>;

/**
 * Crée une courbe entre deux points (point de contrôle = milieu décalé perpendiculairement).
 */
function curvedLineBetween(
  from: [number, number],
  to: [number, number],
  sharpness = 0.5
): GeoJSON.Position[] {
  const fromPoint = turf.point(from);
  const toPoint = turf.point(to);
  const mid = turf.midpoint(fromPoint, toPoint);
  const bearing = turf.bearing(fromPoint, toPoint);
  const dist = turf.distance(fromPoint, toPoint, { units: "kilometers" });
  const offsetKm = Math.min(dist * sharpness, 80);
  const control = turf.destination(mid, offsetKm, bearing + 90, {
    units: "kilometers",
  });
  const line = turf.lineString([
    from,
    control.geometry.coordinates,
    to,
  ]);
  const curved = turf.bezierSpline(line, { sharpness: 0.85 });
  return curved.geometry.coordinates;
}

/**
 * Construit le GeoJSON des segments de route (courbes + propriétés).
 */
export function buildRouteGeoJSON(steps: Step[]): GeoJSON.FeatureCollection {
  const features: RouteSegmentFeature[] = [];

  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const fromCoord: [number, number] = [
      from.coordonnees.lng,
      from.coordonnees.lat,
    ];
    const toCoord: [number, number] = [
      to.coordonnees.lng,
      to.coordonnees.lat,
    ];

    const coords = curvedLineBetween(fromCoord, toCoord);
    const line = turf.lineString(coords);
    const distanceKm = turf.length(line, { units: "kilometers" });
    const durationMin = Math.round((distanceKm / VITESSE_MOYENNE_KMH) * 60);
    const tollCost = getPeage(from.id, to.id);

    features.push({
      type: "Feature",
      id: `segment-${from.id}-${to.id}`,
      geometry: line.geometry,
      properties: {
        segmentId: `${from.id}-${to.id}`,
        fromId: from.id,
        toId: to.id,
        fromName: from.nom,
        toName: to.nom,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMin,
        tollCost,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/** Infos d'un segment entre deux étapes (pour affichage planning) */
export function getSegmentInfo(
  from: { id: string; nom: string; coordonnees: { lat: number; lng: number } },
  to: { id: string; nom: string; coordonnees: { lat: number; lng: number } }
): { distanceKm: number; durationMin: number; tollCost: number } {
  const fromCoord: [number, number] = [from.coordonnees.lng, from.coordonnees.lat];
  const toCoord: [number, number] = [to.coordonnees.lng, to.coordonnees.lat];
  const line = turf.lineString([fromCoord, toCoord]);
  const distanceKm = turf.length(line, { units: "kilometers" });
  const durationMin = Math.round((distanceKm / VITESSE_MOYENNE_KMH) * 60);
  const tollCost = getPeage(from.id, to.id);
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin,
    tollCost,
  };
}

/**
 * Construit une seule ligne (tout le trajet) pour un flux à vitesse uniforme.
 * line-progress 0→1 = tout le trajet, donc une vitesse d'offset constante = même vitesse en km.
 */
export function buildRouteSingleLineGeoJSON(steps: Step[]): GeoJSON.FeatureCollection {
  const fc = buildRouteGeoJSON(steps);
  const allCoords: GeoJSON.Position[] = [];
  for (let i = 0; i < fc.features.length; i++) {
    const coords = (fc.features[i].geometry as GeoJSON.LineString).coordinates;
    if (i === 0) {
      allCoords.push(...coords);
    } else {
      allCoords.push(...coords.slice(1));
    }
  }
  if (allCoords.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }
  const line = turf.lineString(allCoords);
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: line.geometry, properties: {} }],
  };
}
