import { anchorsForRegion, REGION_ANCHORS } from "@/lib/trip-engine/region-anchors";
import { getTerritoryById } from "@/lib/editorial-territories";

export type CityAnchor = { name: string; lat: number; lng: number };

const REGION_KEY_ALIASES: Record<string, string> = {
  provence: "provence-alpes-cote-azur",
  "cote-dazur": "provence-alpes-cote-azur",
  "val-loire-centre": "centre-val-de-loire",
  picardie: "hauts-de-france",
  champagne: "grand-est",
  alsace: "grand-est",
  lorraine: "grand-est",
  bourgogne: "bourgogne-franche-comte",
  franche: "bourgogne-franche-comte",
  "pays-basque": "nouvelle-aquitaine",
  gascogne: "occitanie",
  toulousain: "occitanie",
  perigord: "nouvelle-aquitaine",
  limousin: "nouvelle-aquitaine",
  savoie: "auvergne-rhone-alpes",
  jura: "bourgogne-franche-comte",
  bretagne: "bretagne",
  normandie: "normandie",
};

function normalizeRegionKey(raw: string | undefined): string {
  if (!raw) return "default";
  const k = raw.toLowerCase().trim();
  if (k in REGION_ANCHORS) return k;
  const aliased = REGION_KEY_ALIASES[k];
  if (aliased && aliased in REGION_ANCHORS) return aliased;
  return "default";
}

/**
 * Villes réelles (avec coordonnées) pour un itinéraire généré — jamais de noms factices.
 */
export function getCityPoolForDraft(
  regionKeyFromZone: string | undefined,
  territoryId?: string
): CityAnchor[] {
  let key = normalizeRegionKey(regionKeyFromZone);
  if (territoryId) {
    const t = getTerritoryById(territoryId);
    if (t?.region_key) key = normalizeRegionKey(t.region_key);
  }
  const anchors = anchorsForRegion(key);
  return anchors.map((a) => ({ name: a.name, lat: a.lat, lng: a.lng }));
}

export function slugifyCityId(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "etape"}-${index}`;
}
