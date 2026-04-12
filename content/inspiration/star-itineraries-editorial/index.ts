import type { StarItinerariesEditorialFile } from "@/types/star-itineraries-editorial";
import alsace from "./alsace.json";
import angevinMaine from "./angevin-maine.json";
import auvergne from "./auvergne.json";
import bretagne from "./bretagne.json";
import bourgogne from "./bourgogne.json";
import champagne from "./champagne.json";
import corse from "./corse.json";
import coteDazur from "./cote-dazur.json";
import dauphineRhone from "./dauphine-rhone.json";
import francheComte from "./franche-comte.json";
import girondeLandes from "./gironde-landes.json";
import ileDeFrance from "./ile-de-france.json";
import languedocRoussillon from "./languedoc-roussillon.json";
import limousin from "./limousin.json";
import lorraine from "./lorraine.json";
import nantaisVendee from "./nantais-vendee.json";
import normandie from "./normandie.json";
import paysBasqueBearn from "./pays-basque-bearn.json";
import perigordQuercy from "./perigord-quercy.json";
import picardieFlandre from "./picardie-flandre.json";
import poitouSaintonge from "./poitou-saintonge.json";
import provence from "./provence.json";
import rouergueCevennes from "./rouergue-cevennes.json";
import savoie from "./savoie.json";
import toulousainGascogne from "./toulousain-gascogne.json";
import valLoireCentre from "./val-loire-centre.json";

const as = (x: unknown) => x as StarItinerariesEditorialFile;

/** Contenu Chat — un fichier JSON par région carte. */
export const STAR_ITINERARIES_EDITORIAL_BY_REGION: Record<
  string,
  StarItinerariesEditorialFile
> = {
  alsace: as(alsace),
  "angevin-maine": as(angevinMaine),
  auvergne: as(auvergne),
  bretagne: as(bretagne),
  bourgogne: as(bourgogne),
  champagne: as(champagne),
  corse: as(corse),
  "cote-dazur": as(coteDazur),
  "dauphine-rhone": as(dauphineRhone),
  "franche-comte": as(francheComte),
  "gironde-landes": as(girondeLandes),
  "ile-de-france": as(ileDeFrance),
  "languedoc-roussillon": as(languedocRoussillon),
  limousin: as(limousin),
  lorraine: as(lorraine),
  "nantais-vendee": as(nantaisVendee),
  normandie: as(normandie),
  "pays-basque-bearn": as(paysBasqueBearn),
  "perigord-quercy": as(perigordQuercy),
  "picardie-flandre": as(picardieFlandre),
  "poitou-saintonge": as(poitouSaintonge),
  provence: as(provence),
  "rouergue-cevennes": as(rouergueCevennes),
  savoie: as(savoie),
  "toulousain-gascogne": as(toulousainGascogne),
  "val-loire-centre": as(valLoireCentre),
};

export function starItinerariesEditorialForRegion(
  regionId: string
): StarItinerariesEditorialFile | undefined {
  return STAR_ITINERARIES_EDITORIAL_BY_REGION[regionId];
}
