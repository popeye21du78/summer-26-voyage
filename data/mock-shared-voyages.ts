/**
 * Voyages « partagés à plusieurs » — démo front sans logique backend lourde.
 * Les liens pointent vers des parcours existants ou le hub de création.
 */

export interface VoyagePartageDemo {
  id: string;
  titre: string;
  sousTitre: string;
  href: string;
  avec: string;
  statut: "invitation" | "en_cours";
}

export function getVoyagesPartagesDemo(_profileId: string): VoyagePartageDemo[] {
  return [
    {
      id: "partage-ardèche",
      titre: "Ardèche · été entre amis",
      sousTitre: "Feuille de route commune, chacun ajoute ses envies",
      href: "/planifier/commencer",
      avec: "Camille, Sam",
      statut: "invitation",
    },
    {
      id: "partage-bretagne",
      titre: "Bretagne nord",
      sousTitre: "Carnet partagé · prochaine synchro dimanche",
      href: "/mes-voyages",
      avec: "Équipe Viago (démo)",
      statut: "en_cours",
    },
  ];
}
