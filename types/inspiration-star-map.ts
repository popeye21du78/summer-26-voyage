import type { FeatureCollection } from "geojson";

export type StarItineraryStopDto = {
  slug: string;
  nom: string;
  lat: number;
  lng: number;
  order: number;
  photoUrl: string | null;
  iconKey: string;
};

export type StarLineRouteResponse = {
  line: FeatureCollection;
  stops: StarItineraryStopDto[];
};
