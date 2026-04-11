import type { LineString } from "geojson";

/** Blocs texte + repères photo pour les pages région (carte + scroll). */
export type RegionEditorialTexts = {
  accroche_carte: string;
  paragraphe_explorer: string;
  trois_incontournables: [string, string, string];
  note_terrain: string;
  intro_longue: string;
  ambiance_detail: string;
  /** Indication rédactionnelle (pas une URL imposée). */
  photo_hero_suggestion?: string;
  photo_slots?: {
    hero?: string;
    carousel_intro?: string;
    carousel_incontournables?: string;
  };
};

/** Contenu éditorial carte (région = zone Mapbox inspiration, id aligné sur MAP_REGIONS). */
export type RegionEditorialContent = {
  id: string;
  name: string;
  /** Résumé court (carte / SEO) — en pratique aligné sur `paragraphe_explorer`. */
  shortDescription: string;
  headerPhoto: string;
  photos: string[];
  /** Itinéraires stars rattachés (ids dans star-itineraries). */
  starItineraryIds: string[];
} & RegionEditorialTexts;

/** POI « inspiration » : peut référencer un territoire éditorial existant. */
export type InspirationPoiContent = {
  id: string;
  name: string;
  shortDescription: string;
  type: string;
  coordinates: [number, number];
  photos: string[];
  regionId: string;
  /** Si défini, lien vers fiche territoire `/planifier/inspiration/[id]`. */
  territoryId?: string;
};

export type StarItineraryContent = {
  id: string;
  name: string;
  shortDescription: string;
  coverPhoto: string;
  photos: string[];
  regionId: string;
  poiIds: string[];
  geometry: LineString;
  durationHint?: string;
};

export type InspirationStackEntry =
  | { screen: "france" }
  | { screen: "region-preview"; regionId: string }
  | { screen: "region-explore"; regionId: string }
  | { screen: "poi-detail"; regionId: string; territoryId: string }
  | { screen: "star-list"; regionId: string }
  | { screen: "star-detail"; regionId: string; itineraryId: string };
