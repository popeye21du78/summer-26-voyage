/**
 * Pipeline complet de generation d'itineraire.
 *
 * Scoring (existe) → Clustering DBSCAN → Sequencement inter-clusters (TSP)
 * → Optimisation intra-cluster → Placement des nuits
 *
 * Garantie : l'itineraire forme un fil continu, sans branches ni AR.
 */

import type { LieuScore } from "../score-lieux";
import { dbscan } from "./dbscan";
import { centroid, haversine, type GeoPoint } from "./haversine";
import { assignNights, type DayPlan } from "./nights";
import { solveTSP, totalDistance } from "./tsp";

export interface ItineraryPoint {
  nom: string;
  slug: string;
  lat: number;
  lng: number;
  score: number;
  bucketFamille: string;
  categorieTaille?: string;
  familleType?: string;
  departement: string;
  dureeRecommandee?: string;
  nuitSurPlace: boolean;
  clusterId: number;
}

export interface ItineraryConfig {
  start: GeoPoint;
  end?: GeoPoint;
  totalNights: number;
  rythme: "cool" | "normal" | "intense";
  clusterRadius?: number;
  corridorWidth?: number;
}

export interface Itinerary {
  days: DayPlan[];
  orderedPoints: ItineraryPoint[];
  totalDistanceKm: number;
  clusters: ItineraryPoint[][];
  clusterOrder: number[];
  config: ItineraryConfig;
}

export function generateItinerary(
  lieux: LieuScore[],
  config: ItineraryConfig
): Itinerary {
  const points = lieuxToPoints(lieux);

  const eps = config.clusterRadius ?? adaptiveRadius(points, config.totalNights);

  // 1. Clustering DBSCAN
  const { clusters, noise } = dbscan(
    points,
    (p) => ({ lat: p.lat, lng: p.lng }),
    eps,
    2
  );

  // Rattacher les points isoles au cluster le plus proche
  for (const np of noise) {
    let bestCluster = 0;
    let bestDist = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const center = centroid(clusters[c]);
      const d = haversine(np.lat, np.lng, center.lat, center.lng);
      if (d < bestDist) {
        bestDist = d;
        bestCluster = c;
      }
    }
    if (clusters.length > 0) {
      clusters[bestCluster].push(np);
    } else {
      clusters.push([np]);
    }
  }

  for (let c = 0; c < clusters.length; c++) {
    for (const p of clusters[c]) p.clusterId = c;
  }

  // 2. Sequencer les clusters via TSP sur les centroides
  const centroids: GeoPoint[] = clusters.map((cl) => centroid(cl));
  const allGeo: GeoPoint[] = [config.start, ...centroids];
  if (config.end) allGeo.push(config.end);

  const endIdx = config.end ? allGeo.length - 1 : undefined;
  const clusterRoute = solveTSP(allGeo, 0, endIdx);

  const clusterOrder = clusterRoute
    .filter((i) => i !== 0 && (endIdx === undefined || i !== endIdx))
    .map((i) => i - 1);

  // 3. Ordonner les points intra-cluster en "fil continu"
  //    Chaque cluster a un point d'entree (venant du cluster precedent)
  //    et un point de sortie (allant vers le cluster suivant).
  //    On fait un TSP intra-cluster avec entree et sortie fixes.
  const orderedPoints: ItineraryPoint[] = [];

  for (let k = 0; k < clusterOrder.length; k++) {
    const clIdx = clusterOrder[k];
    const cluster = clusters[clIdx];

    if (cluster.length <= 1) {
      orderedPoints.push(...cluster);
      continue;
    }

    // Point d'entree : venant d'ou ?
    const entryRef: GeoPoint =
      k === 0 ? config.start : centroid(clusters[clusterOrder[k - 1]]);

    // Point de sortie : allant vers ou ?
    const exitRef: GeoPoint =
      k === clusterOrder.length - 1
        ? (config.end ?? config.start)
        : centroid(clusters[clusterOrder[k + 1]]);

    // Trouver le point du cluster le plus proche de l'entree
    const clusterGeo: GeoPoint[] = cluster.map((p) => ({ lat: p.lat, lng: p.lng }));
    let entryIdx = findClosest(clusterGeo, entryRef);

    // Trouver le point du cluster le plus proche de la sortie
    let exitIdx = findClosest(clusterGeo, exitRef);

    // Si entree == sortie (petit cluster), laisser le TSP decider
    if (entryIdx === exitIdx && cluster.length > 2) {
      // Prendre le 2e plus proche de la sortie
      let secondBest = -1;
      let secondDist = Infinity;
      for (let i = 0; i < clusterGeo.length; i++) {
        if (i === exitIdx) continue;
        const d = haversine(exitRef.lat, exitRef.lng, clusterGeo[i].lat, clusterGeo[i].lng);
        if (d < secondDist) {
          secondDist = d;
          secondBest = i;
        }
      }
      if (secondBest >= 0) exitIdx = secondBest;
    }

    // TSP avec entree fixe et sortie fixe
    const intraRoute = solveTSP(clusterGeo, entryIdx, entryIdx !== exitIdx ? exitIdx : undefined);
    for (const idx of intraRoute) {
      orderedPoints.push(cluster[idx]);
    }
  }

  // 4. Placement des nuits
  const days = assignNights(orderedPoints, config.totalNights, config.rythme);

  // 5. Distance totale
  const routeGeo: GeoPoint[] = [
    config.start,
    ...orderedPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
  ];
  if (config.end) routeGeo.push(config.end);
  const totalDist = totalDistance(routeGeo);

  return {
    days,
    orderedPoints,
    totalDistanceKm: Math.round(totalDist),
    clusters,
    clusterOrder,
    config,
  };
}

function findClosest(points: GeoPoint[], ref: GeoPoint): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversine(ref.lat, ref.lng, points[i].lat, points[i].lng);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function adaptiveRadius(points: ItineraryPoint[], totalNights: number): number {
  const targetClusters = Math.max(3, Math.ceil(totalNights * 0.7));
  let eps = 60;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { clusters } = dbscan(points, (p) => ({ lat: p.lat, lng: p.lng }), eps, 2);
    if (clusters.length >= targetClusters) return eps;
    eps = Math.max(10, eps - 5);
  }
  return eps;
}

function lieuxToPoints(lieux: LieuScore[]): ItineraryPoint[] {
  return lieux
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      nom: l.nom,
      slug: l.slug,
      lat: Number(l.lat),
      lng: Number(l.lng),
      score: l.score,
      bucketFamille: l.bucketFamille,
      categorieTaille: l.categorie_taille,
      familleType: l.famille_type,
      departement: l.departement,
      dureeRecommandee: undefined,
      nuitSurPlace: isNuitCandidate(l),
      clusterId: -1,
    }));
}

function isNuitCandidate(l: LieuScore): boolean {
  const ft = l.famille_type ?? l.bucketFamille;
  return ft === "ville" || ft === "village";
}
