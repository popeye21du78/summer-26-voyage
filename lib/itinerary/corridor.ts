/**
 * Filtre corridor : ne garde que les lieux situes dans un couloir
 * entre le point de depart et le point d'arrivee.
 *
 * Deux criteres :
 * 1. Distance perpendiculaire a l'axe < maxDetourKm
 * 2. Projection sur l'axe entre -10% et 110% (marge pour les lieux proches des extremites)
 */

import { haversine, type GeoPoint } from "./haversine";

/**
 * Projette un point sur l'axe start→end et retourne :
 *  - t : position relative (0 = start, 1 = end)
 *  - perpKm : distance perpendiculaire en km
 */
function projectOnAxis(
  point: GeoPoint,
  start: GeoPoint,
  end: GeoPoint,
  routeLen: number
): { t: number; perpKm: number } {
  if (routeLen < 1) {
    return { t: 0, perpKm: haversine(point.lat, point.lng, start.lat, start.lng) };
  }

  const dStart = haversine(point.lat, point.lng, start.lat, start.lng);
  const dEnd = haversine(point.lat, point.lng, end.lat, end.lng);

  // Projection par formule du cosinus :
  // t = (dStart² + routeLen² - dEnd²) / (2 * routeLen * routeLen)
  // Clamped pour calculer la perpendiculaire
  const tRaw = (dStart * dStart + routeLen * routeLen - dEnd * dEnd) / (2 * routeLen * routeLen);

  // Distance perpendiculaire via Pythagore
  const tClamped = Math.max(0, Math.min(1, tRaw));
  const projDist = tClamped * routeLen;
  const perpSq = dStart * dStart - projDist * projDist;
  const perpKm = perpSq > 0 ? Math.sqrt(perpSq) : 0;

  return { t: tRaw, perpKm };
}

export function corridorFilter<T>(
  points: T[],
  getPoint: (item: T) => GeoPoint,
  start: GeoPoint,
  end: GeoPoint,
  maxDetourKm = 100
): T[] {
  const routeLen = haversine(start.lat, start.lng, end.lat, end.lng);

  // Marge longitudinale : 10% de chaque cote
  const tMin = -0.10;
  const tMax = 1.10;

  return points.filter((item) => {
    const p = getPoint(item);
    const { t, perpKm } = projectOnAxis(p, start, end, routeLen);

    // Hors du corridor lateral
    if (perpKm > maxDetourKm) return false;

    // Avant le depart ou apres l'arrivee
    if (t < tMin || t > tMax) return false;

    return true;
  });
}

/**
 * Largeur de corridor adaptee a la duree du voyage.
 */
export function adaptiveCorridorWidth(
  start: GeoPoint,
  end: GeoPoint,
  totalNights: number
): number {
  const routeLen = haversine(start.lat, start.lng, end.lat, end.lng);
  const base = routeLen * 0.15;
  const nightBonus = totalNights * 5;
  return Math.min(200, Math.max(50, base + nightBonus));
}
