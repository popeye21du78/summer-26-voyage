/**
 * Client Waymarked Trails API (OpenStreetMap) — données randos réelles et gratuites.
 * Pas de clé API nécessaire. Données issues d'OSM.
 * Fallback Outdooractive conservé si clé OA configurée.
 */

const WMT_BASE = "https://hiking.waymarkedtrails.org/api/v1";

export type WmtTour = {
  id: number;
  name: string;
  distance_km: number;
  ascent: number;
  descent: number;
  is_roundtrip: boolean;
  url: string;
  official_url: string;
  operator: string;
  bbox_center_lat: number;
  bbox_center_lng: number;
};

type WmtSearchResult = {
  type: string;
  id: number;
  name?: string;
  group?: string;
  ref?: string;
};

type WmtDetail = {
  id: number;
  name?: string;
  official_length?: number;
  operator?: string;
  url?: string;
  bbox?: number[];
  tags?: Record<string, string>;
};

function parseBboxCenter(bbox?: number[]): { lat: number; lng: number } | null {
  if (!bbox || bbox.length < 4) return null;
  const [x1, y1, x2, y2] = bbox;
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const lng = (centerX * 180) / 20037508.34;
  const latRad = Math.atan(Math.exp((centerY * Math.PI) / 20037508.34));
  const lat = (latRad * 360) / Math.PI - 90;
  return { lat, lng };
}

function parseDetail(d: WmtDetail): WmtTour | null {
  if (!d.name) return null;

  const tags = d.tags ?? {};
  const ascent = parseInt(tags.ascent || "0", 10) || 0;
  const descent = parseInt(tags.descent || "0", 10) || 0;
  const distStr = tags.distance || "";
  const distKm = parseFloat(distStr) || (d.official_length ? d.official_length / 1000 : 0);
  const roundtrip = tags.roundtrip === "yes";

  const center = parseBboxCenter(d.bbox);

  return {
    id: d.id,
    name: d.name,
    distance_km: Math.round(distKm * 10) / 10,
    ascent,
    descent,
    is_roundtrip: roundtrip,
    url: d.url ?? `https://hiking.waymarkedtrails.org/#route?id=${d.id}`,
    official_url: tags.website ?? d.url ?? "",
    operator: d.operator ?? "",
    bbox_center_lat: center?.lat ?? 0,
    bbox_center_lng: center?.lng ?? 0,
  };
}

function durationFromAscentDist(ascent: number, distKm: number): string {
  if (distKm <= 0) return "";
  const timeH = distKm / 4 + ascent / 300;
  const h = Math.floor(timeH);
  const m = Math.round((timeH - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function difficultyFromAscent(ascent: number): string {
  if (ascent <= 300) return "T1";
  if (ascent <= 800) return "T2";
  if (ascent <= 1400) return "T3";
  return "T4";
}

export function wmtTourToFields(tour: WmtTour) {
  return {
    nom_rando: tour.name,
    difficulte: difficultyFromAscent(tour.ascent),
    denivele_positif_m: tour.ascent,
    distance_km: tour.distance_km,
    duree_estimee: durationFromAscentDist(tour.ascent, tour.distance_km),
    point_depart_precis: `${tour.bbox_center_lat.toFixed(5)}, ${tour.bbox_center_lng.toFixed(5)}`,
    lat_depart: tour.bbox_center_lat,
    lng_depart: tour.bbox_center_lng,
    url_trace: tour.official_url || tour.url,
    gpx_url: `https://hiking.waymarkedtrails.org/api/v1/details/relation/${tour.id}/gpx`,
  };
}

function isInFrance(lat: number, lng: number): boolean {
  return lat > 42 && lat < 51.5 && lng > -5.5 && lng < 9.5;
}

const EXCLUDE_PATTERNS = [/beek\b/i, /loopje/i, /wanderung/i, /rundweg/i, /weg\b/i, /meile/i, /pfad/i];

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      return res;
    } catch {
      if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

/**
 * Recherche des randos Waymarked Trails par nom de commune.
 * Filtre les résultats hors France et les parcours trop courts.
 */
export async function searchWmtTours(
  commune: string,
  _departement: string,
  maxResults = 10,
): Promise<WmtTour[]> {
  const query = encodeURIComponent(commune);
  const listUrl = `${WMT_BASE}/list/search?query=${query}&limit=${maxResults * 2}`;

  try {
    const listRes = await fetchWithRetry(listUrl);
    if (!listRes || !listRes.ok) {
      console.warn(`   ⚠ WMT search HTTP ${listRes?.status ?? "timeout"}`);
      return [];
    }

    const listJson = (await listRes.json()) as {
      results?: WmtSearchResult[];
    };
    const results = listJson.results ?? [];
    if (results.length === 0) return [];

    const tours: WmtTour[] = [];
    for (const r of results.slice(0, maxResults)) {
      const detailRes = await fetchWithRetry(`${WMT_BASE}/details/${r.type}/${r.id}`);
      if (!detailRes || !detailRes.ok) continue;
      const detail = (await detailRes.json()) as WmtDetail;
      const parsed = parseDetail(detail);
      if (!parsed) continue;
      if (parsed.distance_km < 3) continue;
      if (parsed.bbox_center_lat !== 0 && !isInFrance(parsed.bbox_center_lat, parsed.bbox_center_lng)) continue;
      if (EXCLUDE_PATTERNS.some((p) => p.test(parsed.name))) continue;
      tours.push(parsed);
    }

    return tours;
  } catch (err) {
    console.warn("   ⚠ Erreur Waymarked Trails:", err);
    return [];
  }
}

/**
 * Pour un niveau souhaité, trouve la meilleure rando dans la liste.
 * Préfère les boucles et le niveau de difficulté le plus adapté.
 */
export function bestTourForLevel(
  tours: WmtTour[],
  niveau: "facile" | "modere" | "difficile",
): WmtTour | null {
  if (tours.length === 0) return null;

  const targetAscent =
    niveau === "facile" ? 250 :
    niveau === "modere" ? 600 :
    1000;

  const scored = tours.map((t) => {
    const ascentDiff = Math.abs(t.ascent - targetAscent);
    const roundtripBonus = t.is_roundtrip ? -200 : 0;
    const lengthPenalty = t.distance_km < 3 ? 500 : 0;
    return { tour: t, score: ascentDiff + roundtripBonus + lengthPenalty };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.tour ?? null;
}
