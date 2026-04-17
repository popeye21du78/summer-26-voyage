import type {
  StarItinerariesEditorialFile,
  StarItineraryEditorialItem,
} from "@/types/star-itineraries-editorial";

const EDITORIAL_PROFILE_IDS = [
  "eva-viago",
  "matteo-horizons",
  "lina-routes",
] as const;

/** Répartition stable : chaque itinéraire Stars est rattaché à un voyageur éditorial. */
function editorialProfileForItinerary(regionId: string, itinerarySlug: string): string {
  let h = 0;
  const s = `${regionId}::${itinerarySlug}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  const idx = Math.abs(h) % EDITORIAL_PROFILE_IDS.length;
  return EDITORIAL_PROFILE_IDS[idx]!;
}

function enrichItineraries(
  file: StarItinerariesEditorialFile,
  regionId: string
): StarItinerariesEditorialFile {
  return {
    itineraries: file.itineraries.map((it) => ({
      ...it,
      regionId: it.regionId ?? regionId,
      editorialProfileId: editorialProfileForItinerary(regionId, it.itinerarySlug),
    })),
  };
}
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
  alsace: enrichItineraries(as(alsace), "alsace"),
  "angevin-maine": enrichItineraries(as(angevinMaine), "angevin-maine"),
  auvergne: enrichItineraries(as(auvergne), "auvergne"),
  bretagne: enrichItineraries(as(bretagne), "bretagne"),
  bourgogne: enrichItineraries(as(bourgogne), "bourgogne"),
  champagne: enrichItineraries(as(champagne), "champagne"),
  corse: enrichItineraries(as(corse), "corse"),
  "cote-dazur": enrichItineraries(as(coteDazur), "cote-dazur"),
  "dauphine-rhone": enrichItineraries(as(dauphineRhone), "dauphine-rhone"),
  "franche-comte": enrichItineraries(as(francheComte), "franche-comte"),
  "gironde-landes": enrichItineraries(as(girondeLandes), "gironde-landes"),
  "ile-de-france": enrichItineraries(as(ileDeFrance), "ile-de-france"),
  "languedoc-roussillon": enrichItineraries(as(languedocRoussillon), "languedoc-roussillon"),
  limousin: enrichItineraries(as(limousin), "limousin"),
  lorraine: enrichItineraries(as(lorraine), "lorraine"),
  "nantais-vendee": enrichItineraries(as(nantaisVendee), "nantais-vendee"),
  normandie: enrichItineraries(as(normandie), "normandie"),
  "pays-basque-bearn": enrichItineraries(as(paysBasqueBearn), "pays-basque-bearn"),
  "perigord-quercy": enrichItineraries(as(perigordQuercy), "perigord-quercy"),
  "picardie-flandre": enrichItineraries(as(picardieFlandre), "picardie-flandre"),
  "poitou-saintonge": enrichItineraries(as(poitouSaintonge), "poitou-saintonge"),
  provence: enrichItineraries(as(provence), "provence"),
  "rouergue-cevennes": enrichItineraries(as(rouergueCevennes), "rouergue-cevennes"),
  savoie: enrichItineraries(as(savoie), "savoie"),
  "toulousain-gascogne": enrichItineraries(as(toulousainGascogne), "toulousain-gascogne"),
  "val-loire-centre": enrichItineraries(as(valLoireCentre), "val-loire-centre"),
};

/** Itinéraires Stars rattachés à un profil éditorial (pour page profil). */
export function starItinerariesForEditorialProfile(
  profileId: string
): StarItineraryEditorialItem[] {
  const out: StarItineraryEditorialItem[] = [];
  for (const file of Object.values(STAR_ITINERARIES_EDITORIAL_BY_REGION)) {
    for (const it of file.itineraries) {
      if (it.editorialProfileId === profileId) out.push(it);
    }
  }
  return out;
}

export function starItinerariesEditorialForRegion(
  regionId: string
): StarItinerariesEditorialFile | undefined {
  return STAR_ITINERARIES_EDITORIAL_BY_REGION[regionId];
}
