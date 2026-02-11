import type { Step } from "../types";

/**
 * Données fictives pour le développement et le design.
 * 3 étapes : Paris, Bordeaux, Biarritz.
 */
export const mockSteps: Step[] = [
  {
    id: "paris",
    nom: "Paris",
    nuitee_type: "airbnb" as const,
    date_depart: "2026-06-17",
    nuitees: 2,
    budget_nuitee: 95,
    budget_culture: 80,
    budget_nourriture: 100,
    coordonnees: { lat: 48.8566, lng: 2.3522 },
    date_prevue: "2026-06-15",
    description_culture:
      "Capitale culturelle, musées, quartiers historiques. Prévoir au moins une journée au Louvre ou une balade sur les quais de Seine.",
    budget_prevu: 180,
    contenu_voyage: {
      photos: [
        "https://picsum.photos/800/600?random=paris1",
        "https://picsum.photos/800/600?random=paris2",
      ],
      anecdote:
        "Premier soir : pique-nique au parc des Buttes-Chaumont au coucher du soleil. Les vanlifers du coin nous ont indiqué le spot.",
      depenses_reelles: 165,
    },
  },
  {
    id: "bordeaux",
    nom: "Bordeaux",
    nuitee_type: "van" as const,
    date_depart: "2026-06-20",
    nuitees: 2,
    budget_culture: 50,
    budget_nourriture: 70,
    coordonnees: { lat: 44.8378, lng: -0.5792 },
    date_prevue: "2026-06-18",
    description_culture:
      "Ville de pierre blonde, vignobles à proximité. À ne pas manquer : la place de la Bourse, le miroir d'eau, et une dégustation dans les environs.",
    budget_prevu: 120,
    contenu_voyage: {
      photos: ["https://picsum.photos/800/600?random=bordeaux1"],
      anecdote:
        "Petit-déj sur les quais. Un couple nous a offert des croissants en échange d'une visite du van !",
      depenses_reelles: 98,
    },
  },
  {
    id: "biarritz",
    nom: "Biarritz",
    nuitee_type: "van" as const,
    date_depart: "2026-06-24",
    nuitees: 2,
    budget_culture: 60,
    budget_nourriture: 90,
    coordonnees: { lat: 43.4832, lng: -1.5586 },
    date_prevue: "2026-06-22",
    description_culture:
      "Station balnéaire basque, vagues et plages. Idéal pour une pause surf ou farniente avant la suite du voyage.",
    budget_prevu: 150,
    contenu_voyage: {
      photos: [
        "https://picsum.photos/800/600?random=biarritz1",
        "https://picsum.photos/800/600?random=biarritz2",
        "https://picsum.photos/800/600?random=biarritz3",
      ],
      anecdote:
        "Coucher de soleil sur la Grande Plage. On a enfin trouvé le spot pour dormir face à l'océan.",
      depenses_reelles: 142,
    },
  },
];
