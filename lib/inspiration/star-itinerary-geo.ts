import type { LineString } from "geojson";
import type { DrivingRouteStep } from "@/lib/mapbox-driving-line";
import type { LieuCentralRow } from "@/lib/inspiration-lieux-region";
import { optimizeVisitOrder } from "@/lib/inspiration/visit-order";
import type {
  StarItineraryEditorialItem,
  StarItineraryStepEditorial,
} from "@/types/star-itineraries-editorial";

export type ResolvedStarStep = {
  slug: string;
  nom: string;
  lat: number;
  lng: number;
};

export function lieuxSlugToCoordMap(lieux: LieuCentralRow[]): Map<string, [number, number]> {
  const bySlug = new Map<string, [number, number]>();
  for (const l of lieux) {
    if (typeof l.lat === "number" && typeof l.lng === "number" && l.slug) {
      bySlug.set(l.slug, [l.lng, l.lat]);
    }
  }
  return bySlug;
}

/** Étapes du JSON dans l’ordre Chat, avec coordonnées (ignore les slugs absents de lieux-central). */
export function resolveStepsInEditorialOrder(
  steps: StarItineraryStepEditorial[],
  bySlug: Map<string, [number, number]>
): ResolvedStarStep[] {
  const out: ResolvedStarStep[] = [];
  for (const s of steps) {
    const c = bySlug.get(s.slug);
    if (!c) continue;
    out.push({
      slug: s.slug,
      nom: s.nom,
      lat: c[1],
      lng: c[0],
    });
  }
  return out;
}

/**
 * Réordonne les étapes pour raccourcir le parcours (haversine + 2-opt), en ancrant
 * la première étape résolue (première ville du fil Chat).
 */
export function orderResolvedStepsForShortPath(resolved: ResolvedStarStep[]): ResolvedStarStep[] {
  if (resolved.length <= 2) return resolved;
  const pts = resolved.map((r) => ({ lat: r.lat, lng: r.lng }));
  const order = optimizeVisitOrder(pts, 0);
  return order.map((i) => resolved[i]);
}

export function buildLineStringFromResolved(ordered: ResolvedStarStep[]): LineString | null {
  if (ordered.length < 2) return null;
  return {
    type: "LineString",
    coordinates: ordered.map((r) => [r.lng, r.lat] as [number, number]),
  };
}

/** Utilitaire : résolution + ordre optimisé pour un itinéraire éditorial. */
export function orderedStepsForItinerary(
  it: StarItineraryEditorialItem,
  lieuxInRegion: LieuCentralRow[]
): ResolvedStarStep[] {
  const bySlug = lieuxSlugToCoordMap(lieuxInRegion);
  const resolved = resolveStepsInEditorialOrder(it.steps, bySlug);
  return orderResolvedStepsForShortPath(resolved);
}

export function toDrivingRouteSteps(resolved: ResolvedStarStep[]): DrivingRouteStep[] {
  return resolved.map((r) => ({
    id: r.slug,
    nom: r.nom,
    lat: r.lat,
    lng: r.lng,
  }));
}
