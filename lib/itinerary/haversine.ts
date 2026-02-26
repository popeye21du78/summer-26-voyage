/**
 * Distance Haversine entre deux points GPS (en km).
 * Precision ~0.5% — suffisant pour le clustering et le TSP.
 */

const R = 6371;

export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Matrice de distances Haversine (symetrique) */
export function distanceMatrix(points: GeoPoint[]): number[][] {
  const n = points.length;
  const mat: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      mat[i][j] = d;
      mat[j][i] = d;
    }
  }
  return mat;
}

/** Centre geographique d'un ensemble de points */
export function centroid(points: GeoPoint[]): GeoPoint {
  const n = points.length;
  if (n === 0) return { lat: 0, lng: 0 };
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
}
