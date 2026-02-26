/**
 * TSP ouvert (depart → arrivee) via nearest-neighbor + amelioration 2-opt.
 * Pour < 10 points : permutation exhaustive (optimal exact).
 */

import { distanceMatrix, type GeoPoint } from "./haversine";

/**
 * Resout un TSP ouvert (pas de retour au depart).
 * @param points - coordonnees des points a ordonner
 * @param startIdx - indice du point de depart (optionnel, sinon 0)
 * @param endIdx - indice du point d'arrivee (optionnel, sinon libre)
 * @returns indices dans l'ordre optimal
 */
export function solveTSP(
  points: GeoPoint[],
  startIdx = 0,
  endIdx?: number
): number[] {
  const n = points.length;
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];

  const dist = distanceMatrix(points);

  if (n <= 9) {
    return exhaustiveTSP(dist, n, startIdx, endIdx);
  }

  let route = nearestNeighbor(dist, n, startIdx);

  if (endIdx !== undefined && endIdx !== route[route.length - 1]) {
    const pos = route.indexOf(endIdx);
    if (pos !== -1) {
      route.splice(pos, 1);
      route.push(endIdx);
    }
  }

  route = twoOpt(route, dist, startIdx, endIdx);
  return route;
}

function nearestNeighbor(dist: number[][], n: number, start: number): number[] {
  const visited = new Set<number>([start]);
  const route = [start];
  let current = start;

  while (visited.size < n) {
    let bestDist = Infinity;
    let bestIdx = -1;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (dist[current][j] < bestDist) {
        bestDist = dist[current][j];
        bestIdx = j;
      }
    }
    if (bestIdx === -1) break;
    visited.add(bestIdx);
    route.push(bestIdx);
    current = bestIdx;
  }
  return route;
}

function routeCost(route: number[], dist: number[][]): number {
  let cost = 0;
  for (let i = 0; i < route.length - 1; i++) {
    cost += dist[route[i]][route[i + 1]];
  }
  return cost;
}

function twoOpt(
  route: number[],
  dist: number[][],
  fixStart: number,
  fixEnd?: number
): number[] {
  const n = route.length;
  let improved = true;
  let best = [...route];
  let bestCost = routeCost(best, dist);

  while (improved) {
    improved = false;
    const iStart = route[0] === fixStart ? 1 : 0;
    const iEnd = fixEnd !== undefined && route[n - 1] === fixEnd ? n - 2 : n - 1;

    for (let i = iStart; i < iEnd; i++) {
      for (let j = i + 1; j <= iEnd; j++) {
        const newRoute = [...best];
        const segment = newRoute.slice(i, j + 1).reverse();
        newRoute.splice(i, j - i + 1, ...segment);
        const newCost = routeCost(newRoute, dist);
        if (newCost < bestCost - 0.01) {
          best = newRoute;
          bestCost = newCost;
          improved = true;
        }
      }
    }
  }
  return best;
}

function exhaustiveTSP(
  dist: number[][],
  n: number,
  start: number,
  end?: number
): number[] {
  const others = Array.from({ length: n }, (_, i) => i).filter(
    (i) => i !== start && i !== end
  );

  let bestRoute: number[] = [];
  let bestCost = Infinity;

  function permute(arr: number[], l: number) {
    if (l === arr.length) {
      const route = [start, ...arr];
      if (end !== undefined) route.push(end);
      const cost = routeCost(route, dist);
      if (cost < bestCost) {
        bestCost = cost;
        bestRoute = [...route];
      }
      return;
    }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }

  permute(others, 0);
  return bestRoute;
}

/** Distance totale d'une route (km) */
export function totalDistance(route: GeoPoint[]): number {
  const dist = distanceMatrix(route);
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += dist[i][i + 1];
  }
  return total;
}
