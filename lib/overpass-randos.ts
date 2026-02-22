/**
 * Module randos 100% Overpass (OpenStreetMap) — v2.
 * - Filtre jour : 3-25 km uniquement (pas de GR multi-jours)
 * - Estimation D+ quand le tag ascent est absent
 * - Pénalité sentiers sans D+ / bonus sentiers avec données complètes
 * - Reverse geocode pour commune_depart
 * - Appel GPT léger pour justification 1 phrase (noms réels → pas d'hallucination)
 */

/** Instances Overpass (fallback si timeout/504). Limite 200 par requête. */
const OVERPASS_INSTANCES = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const MIN_DIST_KM = 3;
const MAX_DIST_KM = 25;

export type HikingTrail = {
  osm_id: number;
  name: string;
  distance_km: number;
  ascent: number;
  ascent_estimated: boolean;
  descent: number;
  is_roundtrip: boolean;
  network: string;
  operator: string;
  website: string;
  center_lat: number;
  center_lng: number;
  quality_score: number;
  difficulty: string;
  duration: string;
  gpx_url: string;
  web_url: string;
  commune_depart: string;
  justification: string;
};

type OverpassElement = {
  type: string;
  id: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
};

/**
 * Estimation D+ quand le tag est absent.
 * Heuristique : on se base sur l'étendue verticale de la bbox (proxy pour le relief)
 * et la distance. En zone de montagne (grande bbox), D+ est plus élevé.
 */
function estimateAscent(distKm: number, bounds: { minlat: number; maxlat: number; minlon: number; maxlon: number }): number {
  const latSpanKm = (bounds.maxlat - bounds.minlat) * 111;
  const lngSpanKm = (bounds.maxlon - bounds.minlon) * 111 * Math.cos(((bounds.minlat + bounds.maxlat) / 2) * Math.PI / 180);
  const bboxDiagKm = Math.sqrt(latSpanKm ** 2 + lngSpanKm ** 2);
  const compactness = bboxDiagKm > 0 ? distKm / bboxDiagKm : 1;

  if (compactness > 3) return Math.round(distKm * 20);
  if (compactness > 1.5) return Math.round(distKm * 35);
  return Math.round(distKm * 55);
}

function difficultyFromAscent(ascent: number): string {
  if (ascent <= 300) return "T1";
  if (ascent <= 800) return "T2";
  if (ascent <= 1400) return "T3";
  return "T4";
}

function durationFromAscentDist(ascent: number, distKm: number): string {
  if (distKm <= 0) return "";
  const timeH = distKm / 4 + ascent / 300;
  const h = Math.floor(timeH);
  const m = Math.round((timeH - h) * 60);
  if (h === 0 && m === 0) return "0h30";
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function parseElement(el: OverpassElement): HikingTrail | null {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) return null;
  if (!el.bounds) return null;

  const distStr = tags.distance || tags["official_length"] || "";
  let distKm = parseFloat(distStr.replace(",", ".").replace(/\s*km$/i, "")) || 0;
  if (distKm > 500) distKm = distKm / 1000;
  if (distKm < MIN_DIST_KM || distKm > MAX_DIST_KM) return null;

  const rawAscent = parseInt(tags.ascent || "", 10);
  const hasRealAscent = !isNaN(rawAscent) && rawAscent > 0;
  const ascent = hasRealAscent ? rawAscent : estimateAscent(distKm, el.bounds);
  const descent = parseInt(tags.descent || "0", 10) || (hasRealAscent ? 0 : ascent);
  const isRoundtrip = tags.roundtrip === "yes";
  const network = tags.network || "";
  const operator = tags.operator || "";
  const website = tags.website || tags.url || "";

  const centerLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
  const centerLng = (el.bounds.minlon + el.bounds.maxlon) / 2;

  let score = 0;

  if (hasRealAscent) score += 20;

  if (website) score += 15;
  if (operator) score += 10;
  if (isRoundtrip) score += 12;

  if (network === "lwn") score += 10;
  else if (network === "rwn") score += 8;
  else if (network === "nwn" || network === "iwn") score += 3;

  if (ascent >= 200 && ascent <= 1200) score += 5;
  if (distKm >= 6 && distKm <= 18) score += 5;

  return {
    osm_id: el.id,
    name,
    distance_km: Math.round(distKm * 10) / 10,
    ascent,
    ascent_estimated: !hasRealAscent,
    descent,
    is_roundtrip: isRoundtrip,
    network,
    operator,
    website,
    center_lat: centerLat,
    center_lng: centerLng,
    quality_score: score,
    difficulty: difficultyFromAscent(ascent),
    duration: durationFromAscentDist(ascent, distKm),
    gpx_url: `https://hiking.waymarkedtrails.org/api/v1/details/relation/${el.id}/gpx`,
    web_url: website || `https://hiking.waymarkedtrails.org/#route?id=${el.id}`,
    commune_depart: "",
    justification: "",
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchDepartmentTrails(codeDep: string): Promise<HikingTrail[]> {
  // Limite 200 pour éviter timeouts sur départements denses.
  const query = `[out:json][timeout:45];
area["boundary"="administrative"]["admin_level"="6"]["ref"="${codeDep}"]->.dept;
rel["route"="hiking"](area.dept);
out tags bb 200;`;

  console.log(`>> Overpass: recherche des sentiers balisés du département ${codeDep}...`);

  const FETCH_TIMEOUT_MS = 30000;
  let res: Response | null = null;
  let raw = "";

  try {
    for (const baseUrl of OVERPASS_INSTANCES) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
          res = await fetch(baseUrl, {
            method: "POST",
            body: `data=${encodeURIComponent(query)}`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            signal: ctrl.signal,
          });
          clearTimeout(to);
          raw = await res.text();

          if (!res.ok) {
            console.warn(`   ⚠ Overpass HTTP ${res.status} (tentative ${attempt}/2)`);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 8000));
            continue;
          }

          if (!raw.trim().startsWith("{")) {
            console.warn(`   ⚠ Overpass XML au lieu de JSON (tentative ${attempt}/2)`);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 8000));
            continue;
          }

          break;
        } catch (err) {
          console.warn(`   ⚠ Overpass:`, (err as Error).message);
          if (attempt < 2) await new Promise((r) => setTimeout(r, 5000));
        }
      }

      if (res?.ok && raw.trim().startsWith("{")) break;
      console.warn(`   → Instance suivante...`);
    }

    if (!res || !res.ok || !raw.trim().startsWith("{")) {
      console.warn(`   ⚠ Overpass échec → 0 randos pour ce département`);
      return [];
    }

    const json = JSON.parse(raw) as { elements?: OverpassElement[] };
    const elements = json.elements ?? [];
    console.log(`   ${elements.length} relations trouvées`);

    const trails = elements
      .map(parseElement)
      .filter((t): t is HikingTrail => t !== null);

    console.log(`   ${trails.length} sentiers valides (${MIN_DIST_KM}-${MAX_DIST_KM}km)`);
    return trails;
  } catch {
    console.warn(`   ⚠ Overpass erreur inattendue → 0 randos`);
    return [];
  }
}

export function selectTopTrails(
  trails: HikingTrail[],
  count: number,
  minDistKm = 10,
): HikingTrail[] {
  const sorted = [...trails].sort((a, b) => b.quality_score - a.quality_score);
  const selected: HikingTrail[] = [];

  for (const t of sorted) {
    if (selected.length >= count) break;
    const tooClose = selected.some(
      (s) => haversineKm(s.center_lat, s.center_lng, t.center_lat, t.center_lng) < minDistKm,
    );
    if (!tooClose) selected.push(t);
  }

  if (selected.length < count) {
    for (const t of sorted) {
      if (selected.length >= count) break;
      if (!selected.includes(t)) selected.push(t);
    }
  }

  return selected;
}

/**
 * Reverse geocode : coordonnées → nom de commune via API Nominatim.
 */
export async function reverseGeocodeCommune(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VoyageVoyageApp/1.0" },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      address?: { village?: string; town?: string; city?: string; municipality?: string; county?: string };
    };
    const addr = data.address;
    if (!addr) return "";
    return addr.village || addr.town || addr.city || addr.municipality || "";
  } catch {
    return "";
  }
}

/**
 * Enrichit les sentiers sélectionnés :
 * - Reverse geocode pour commune_depart
 * - Respect du rate limit Nominatim (1 req/s)
 */
export async function enrichTrailsCommune(trails: HikingTrail[]): Promise<void> {
  for (const t of trails) {
    const commune = await reverseGeocodeCommune(t.center_lat, t.center_lng);
    if (commune) t.commune_depart = commune;
    await new Promise((r) => setTimeout(r, 1100));
  }
}

export function trailToRow(
  trail: HikingTrail,
  codeDep: string,
  nomDep: string,
): Record<string, unknown> {
  const ascentStr = trail.ascent_estimated
    ? `~${trail.ascent}`
    : String(trail.ascent);

  return {
    code_dep: codeDep,
    departement: nomDep,
    nom: trail.name,
    commune_depart: trail.commune_depart,
    justification: trail.justification,
    niveau_souhaite:
      trail.difficulty === "T1" ? "facile" :
      trail.difficulty === "T2" ? "modere" : "difficile",
    difficulte: trail.difficulty,
    denivele_positif_m: ascentStr,
    distance_km: trail.distance_km,
    duree_estimee: trail.duration,
    point_depart_precis: `${trail.center_lat.toFixed(5)}, ${trail.center_lng.toFixed(5)}`,
    parking_info: "",
    url_trace: trail.web_url,
    gpx_url: trail.gpx_url,
    lat_depart: trail.center_lat,
    lng_depart: trail.center_lng,
  };
}
