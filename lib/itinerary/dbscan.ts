/**
 * DBSCAN — clustering par densite pour regrouper les lieux geographiquement.
 * Rayon adaptatif selon le nombre de lieux.
 */

import { haversine, type GeoPoint } from "./haversine";

export interface ClusterResult<T> {
  clusters: T[][];
  noise: T[];
}

/**
 * DBSCAN generique sur des objets ayant lat/lng.
 * @param items - objets a clusteriser
 * @param getPoint - extracteur de coordonnees
 * @param eps - rayon en km (defaut 40)
 * @param minPts - minimum de points pour former un cluster (defaut 2)
 */
export function dbscan<T>(
  items: T[],
  getPoint: (item: T) => GeoPoint,
  eps = 40,
  minPts = 2
): ClusterResult<T> {
  const n = items.length;
  const labels = new Array<number>(n).fill(-1); // -1 = non visite
  let clusterId = 0;

  function regionQuery(idx: number): number[] {
    const p = getPoint(items[idx]);
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === idx) continue;
      const q = getPoint(items[j]);
      if (haversine(p.lat, p.lng, q.lat, q.lng) <= eps) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    const neighbors = regionQuery(i);
    if (neighbors.length + 1 < minPts) {
      labels[i] = -2; // bruit
      continue;
    }

    labels[i] = clusterId;
    const seed = new Set(neighbors);

    for (const j of seed) {
      if (labels[j] === -2) labels[j] = clusterId;
      if (labels[j] !== -1) continue;
      labels[j] = clusterId;
      const jNeighbors = regionQuery(j);
      if (jNeighbors.length + 1 >= minPts) {
        for (const k of jNeighbors) seed.add(k);
      }
    }
    clusterId++;
  }

  const clusters: T[][] = Array.from({ length: clusterId }, () => []);
  const noise: T[] = [];
  for (let i = 0; i < n; i++) {
    if (labels[i] >= 0) clusters[labels[i]].push(items[i]);
    else noise.push(items[i]);
  }

  return { clusters, noise };
}
