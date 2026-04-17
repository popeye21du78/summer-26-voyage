/** JSON collé depuis Chat — `content/inspiration/star-itineraries-editorial/<regionId>.json` */

export type StarItineraryStepEditorial = {
  slug: string;
  nom: string;
  role?: "etape" | "alternative";
};

export type SuggestedPoiAddition = {
  nom: string;
  raison: string;
  type: string;
};

export type StarItineraryEditorialItem = {
  themeTitle: string;
  durationHint: string;
  tripTitle: string;
  summary: string;
  overnightStyle: string;
  regionId: string;
  itinerarySlug: string;
  /** Profil éditorial « propriétaire » de l’itinéraire (Eva / Matteo / Lina). */
  editorialProfileId?: string;
  steps: StarItineraryStepEditorial[];
  suggestedPoiAdditions: SuggestedPoiAddition[];
};

export type StarItinerariesEditorialFile = {
  itineraries: StarItineraryEditorialItem[];
};
