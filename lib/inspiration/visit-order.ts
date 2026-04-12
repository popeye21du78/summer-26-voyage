import { haversineKm } from "@/lib/geo/haversine";

type Pt = { lat: number; lng: number };

function pathLengthKm(order: number[], points: Pt[]): number {
  let s = 0;
  for (let i = 0; i < order.length - 1; i++) {
    s += haversineKm(points[order[i]], points[order[i + 1]]);
  }
  return s;
}

/** Plus proche voisin depuis un point d’ancrage (souvent la première étape « Chat »). */
export function orderOpenPathNearestNeighbor(points: Pt[], anchorIndex: number): number[] {
  const n = points.length;
  if (n <= 1) return Array.from({ length: n }, (_, i) => i);
  let start = anchorIndex;
  if (start < 0 || start >= n) start = 0;

  const visited = new Set<number>();
  const order: number[] = [];
  let current = start;
  visited.add(current);
  order.push(current);

  while (visited.size < n) {
    let next = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      const d = haversineKm(points[current], points[j]);
      if (d < bestD) {
        bestD = d;
        next = j;
      }
    }
    if (next < 0) break;
    visited.add(next);
    order.push(next);
    current = next;
  }
  return order;
}

/** Amélioration 2-opt sur un chemin ouvert (inverse des segments internes). */
export function twoOptOpenPath(order: number[], points: Pt[]): number[] {
  if (order.length <= 3) return order.slice();
  let ord = order.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < ord.length - 1; i++) {
      for (let j = i + 2; j < ord.length; j++) {
        const newOrd = [
          ...ord.slice(0, i + 1),
          ...ord.slice(i + 1, j + 1).reverse(),
          ...ord.slice(j + 1),
        ];
        if (pathLengthKm(newOrd, points) < pathLengthKm(ord, points) - 1e-9) {
          ord = newOrd;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return ord;
}

/**
 * Ordre de passage approximativement le plus court (haversine), en gardant la première
 * étape résolue comme entrée de boucle (ancrage « contenu Chat »).
 */
export function optimizeVisitOrder(points: Pt[], anchorIndex = 0): number[] {
  if (points.length <= 2) return Array.from({ length: points.length }, (_, i) => i);
  const nn = orderOpenPathNearestNeighbor(points, anchorIndex);
  return twoOptOpenPath(nn, points);
}
