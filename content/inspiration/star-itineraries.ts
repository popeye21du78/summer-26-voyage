import type { StarItineraryContent } from "@/types/inspiration";

/**
 * Itinéraires stars (éditoriaux). Géométries simplifiées pour la carte ; à enrichir.
 */
export const STAR_ITINERARIES: StarItineraryContent[] = [
  {
    id: "star-breton-littoral",
    name: "Littoral sauvage breton",
    shortDescription: "De cap en cap, granit et embruns.",
    coverPhoto:
      "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80",
    ],
    regionId: "bretagne",
    poiIds: [],
    geometry: {
      type: "LineString",
      coordinates: [
        [-4.48, 48.38],
        [-4.1, 48.65],
        [-3.35, 48.78],
        [-2.76, 48.65],
      ],
    },
    durationHint: "4–6 jours",
  },
  {
    id: "star-provence-lavande",
    name: "Routes de la lavande",
    shortDescription: "Plateaux et villages perchés.",
    coverPhoto:
      "https://images.unsplash.com/photo-1524413840807-0c3cb6db8082?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80",
    ],
    regionId: "provence",
    poiIds: [],
    geometry: {
      type: "LineString",
      coordinates: [
        [5.78, 43.97],
        [6.07, 44.0],
        [6.24, 43.89],
        [6.39, 43.79],
      ],
    },
    durationHint: "3–5 jours",
  },
  {
    id: "star-cote-azur-balcons",
    name: "Balcons de la méditerranée",
    shortDescription: "Corniches et calanques.",
    coverPhoto:
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1519046904884-53103a58e813?w=800&q=80",
    ],
    regionId: "cote-dazur",
    poiIds: [],
    geometry: {
      type: "LineString",
      coordinates: [
        [7.02, 43.55],
        [7.12, 43.68],
        [7.22, 43.7],
        [7.33, 43.7],
      ],
    },
    durationHint: "Week-end ou semaine",
  },
  {
    id: "star-val-loire-chateaux",
    name: "Châteaux et vignobles du Val de Loire",
    shortDescription: "Patrimoine UNESCO au fil de l’eau.",
    coverPhoto:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1565008576549-57b0b8d9e0c0?w=800&q=80",
    ],
    regionId: "val-loire-centre",
    poiIds: [],
    geometry: {
      type: "LineString",
      coordinates: [
        [0.7, 47.4],
        [1.05, 47.32],
        [1.33, 47.59],
        [1.94, 47.33],
      ],
    },
    durationHint: "5–7 jours",
  },
  {
    id: "star-lyon-alpes",
    name: "Des vignobles aux sommets",
    shortDescription: "Vallées et cols du Dauphiné.",
    coverPhoto:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ],
    regionId: "dauphine-rhone",
    poiIds: [],
    geometry: {
      type: "LineString",
      coordinates: [
        [4.83, 45.76],
        [5.73, 45.19],
        [6.07, 45.5],
        [6.63, 45.07],
      ],
    },
    durationHint: "1 semaine",
  },
];

export function starItinerariesByRegion(regionId: string): StarItineraryContent[] {
  return STAR_ITINERARIES.filter((s) => s.regionId === regionId);
}

export function starItineraryById(id: string): StarItineraryContent | undefined {
  return STAR_ITINERARIES.find((s) => s.id === id);
}
