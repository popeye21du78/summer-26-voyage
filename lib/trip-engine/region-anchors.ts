/** Villes de référence par grande zone — pour heuristiques de bases de nuit. */
export const REGION_ANCHORS: Record<
  string,
  { name: string; lat: number; lng: number }[]
> = {
  "nouvelle-aquitaine": [
    { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
    { name: "Biarritz", lat: 43.4832, lng: -1.5586 },
    { name: "La Rochelle", lat: 46.1603, lng: -1.1511 },
    { name: "Périgueux", lat: 45.1842, lng: 0.721 },
    { name: "Bayonne", lat: 43.4929, lng: -1.4758 },
  ],
  occitanie: [
    { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
    { name: "Montpellier", lat: 43.6108, lng: 3.8767 },
    { name: "Carcassonne", lat: 43.2122, lng: 2.3537 },
    { name: "Albi", lat: 43.926, lng: 2.148 },
    { name: "Nîmes", lat: 43.8367, lng: 4.3601 },
  ],
  "provence-alpes-cote-azur": [
    { name: "Marseille", lat: 43.2965, lng: 5.3698 },
    { name: "Aix-en-Provence", lat: 43.5297, lng: 5.4474 },
    { name: "Avignon", lat: 43.9493, lng: 4.8055 },
    { name: "Nice", lat: 43.7102, lng: 7.262 },
    { name: "Gap", lat: 44.5594, lng: 6.0788 },
  ],
  "grand-est": [
    { name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
    { name: "Colmar", lat: 48.0794, lng: 7.3585 },
    { name: "Nancy", lat: 48.6921, lng: 6.1844 },
    { name: "Metz", lat: 49.1193, lng: 6.1757 },
    { name: "Reims", lat: 49.2583, lng: 4.0317 },
  ],
  bretagne: [
    { name: "Rennes", lat: 48.1173, lng: -1.6778 },
    { name: "Brest", lat: 48.3905, lng: -4.4861 },
    { name: "Vannes", lat: 47.6582, lng: -2.7608 },
    { name: "Quimper", lat: 47.996, lng: -4.098 },
    { name: "Saint-Malo", lat: 48.6493, lng: -2.0075 },
  ],
  "auvergne-rhone-alpes": [
    { name: "Lyon", lat: 45.764, lng: 4.8357 },
    { name: "Grenoble", lat: 45.1885, lng: 5.7245 },
    { name: "Annecy", lat: 45.8992, lng: 6.1294 },
    { name: "Chambéry", lat: 45.5646, lng: 5.9178 },
    { name: "Clermont-Ferrand", lat: 45.7772, lng: 3.087 },
  ],
  "centre-val-de-loire": [
    { name: "Tours", lat: 47.3941, lng: 0.6848 },
    { name: "Orléans", lat: 47.9029, lng: 1.9039 },
    { name: "Blois", lat: 47.5861, lng: 1.3359 },
    { name: "Chartres", lat: 48.4439, lng: 1.489 },
  ],
  "pays-de-la-loire": [
    { name: "Nantes", lat: 47.2184, lng: -1.5536 },
    { name: "Angers", lat: 47.4739, lng: -0.5517 },
    { name: "Le Mans", lat: 48.0077, lng: 0.1984 },
    { name: "La Baule", lat: 47.2842, lng: -2.3927 },
  ],
  default: [
    { name: "Lyon", lat: 45.764, lng: 4.8357 },
    { name: "Paris", lat: 48.8566, lng: 2.3522 },
    { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  ],
};

export function anchorsForRegion(regionKey: string | undefined) {
  if (!regionKey) return REGION_ANCHORS.default;
  return REGION_ANCHORS[regionKey] ?? REGION_ANCHORS.default;
}
