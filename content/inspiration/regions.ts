import { MAP_REGIONS } from "@/lib/inspiration-map-regions-config";
import type { RegionEditorialContent } from "@/types/inspiration";
import { REGION_EDITORIAL_TEXTS } from "@/content/inspiration/region-editorial-texts";

const HEADERS = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f9?w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&q=80",
];

function photosForIndex(i: number): string[] {
  const a = HEADERS[i % HEADERS.length];
  const b = HEADERS[(i + 2) % HEADERS.length];
  const c = HEADERS[(i + 4) % HEADERS.length];
  const d = HEADERS[(i + 1) % HEADERS.length];
  const e = HEADERS[(i + 3) % HEADERS.length];
  return [a, b, c, d, e];
}

/** Régions avec itinéraires stars (ids alignés sur content/inspiration/star-itineraries). */
const STAR_IDS: Partial<Record<string, string[]>> = {
  bretagne: ["star-breton-littoral"],
  provence: ["star-provence-lavande"],
  "cote-dazur": ["star-cote-azur-balcons"],
  "val-loire-centre": ["star-val-loire-chateaux"],
  "dauphine-rhone": ["star-lyon-alpes"],
};

export const REGION_EDITORIAL: Record<string, RegionEditorialContent> = Object.fromEntries(
  MAP_REGIONS.map((r, i) => {
    const texts = REGION_EDITORIAL_TEXTS[r.id];
    if (!texts) throw new Error(`REGION_EDITORIAL_TEXTS manquant: ${r.id}`);
    const header = HEADERS[i % HEADERS.length];
    const content: RegionEditorialContent = {
      id: r.id,
      name: r.name,
      shortDescription: texts.paragraphe_explorer,
      headerPhoto: header,
      photos: photosForIndex(i),
      starItineraryIds: STAR_IDS[r.id] ?? [],
      accroche_carte: texts.accroche_carte,
      paragraphe_explorer: texts.paragraphe_explorer,
      trois_incontournables: texts.trois_incontournables,
      note_terrain: texts.note_terrain,
      intro_longue: texts.intro_longue,
      ambiance_detail: texts.ambiance_detail,
      photo_hero_suggestion: texts.photo_hero_suggestion,
      photo_slots: texts.photo_slots,
    };
    return [r.id, content];
  })
);

export function getRegionEditorial(id: string): RegionEditorialContent | undefined {
  return REGION_EDITORIAL[id];
}

export function listRegionEditorials(): RegionEditorialContent[] {
  return MAP_REGIONS.map((r) => REGION_EDITORIAL[r.id]).filter(Boolean);
}
