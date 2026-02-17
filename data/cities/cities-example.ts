/**
 * Liste d’exemple de villes / villages pour la carte et le moteur.
 * Même contenu que cities-example.csv (importable côté app).
 * Plus Beaux Villages : oui/non selon liste data.gouv.fr (juillet 2023).
 */

export interface CityPoint {
  id: string;
  nom: string;
  slug: string;
  departement: string;
  ancienne_region: string;
  lat: number;
  lng: number;
  plus_beaux_villages: "oui" | "non";
  notes: string;
}

export const citiesExample: CityPoint[] = [
  {
    id: "saint-cirq-lapopie",
    nom: "Saint-Cirq-Lapopie",
    slug: "saint-cirq-lapopie",
    departement: "Lot",
    ancienne_region: "Midi-Pyrénées",
    lat: 44.4642,
    lng: 1.6719,
    plus_beaux_villages: "oui",
    notes: "médiéval perché, très populaire",
  },
  {
    id: "cordes-sur-ciel",
    nom: "Cordes-sur-Ciel",
    slug: "cordes-sur-ciel",
    departement: "Tarn",
    ancienne_region: "Midi-Pyrénées",
    lat: 44.0611,
    lng: 1.9511,
    plus_beaux_villages: "oui",
    notes: "bastide médiévale",
  },
  {
    id: "lautrec",
    nom: "Lautrec",
    slug: "lautrec",
    departement: "Tarn",
    ancienne_region: "Midi-Pyrénées",
    lat: 43.7092,
    lng: 2.1392,
    plus_beaux_villages: "oui",
    notes: "Les Plus Beaux Villages",
  },
  {
    id: "saint-jean-pied-de-port",
    nom: "Saint-Jean-Pied-de-Port",
    slug: "saint-jean-pied-de-port",
    departement: "Pyrénées-Atlantiques",
    ancienne_region: "Nouvelle-Aquitaine",
    lat: 43.1631,
    lng: -1.2383,
    plus_beaux_villages: "oui",
    notes: "cité basque",
  },
  {
    id: "sainte-enimie",
    nom: "Sainte-Enimie",
    slug: "sainte-enimie",
    departement: "Lozère",
    ancienne_region: "Occitanie",
    lat: 44.3656,
    lng: 3.4122,
    plus_beaux_villages: "oui",
    notes: "village des Gorges du Tarn",
  },
  {
    id: "sarlat-la-caneda",
    nom: "Sarlat-la-Canéda",
    slug: "sarlat-la-caneda",
    departement: "Dordogne",
    ancienne_region: "Nouvelle-Aquitaine",
    lat: 44.8892,
    lng: 1.2161,
    plus_beaux_villages: "oui",
    notes: "médiéval renommé",
  },
  {
    id: "carcassonne",
    nom: "Carcassonne",
    slug: "carcassonne",
    departement: "Aude",
    ancienne_region: "Occitanie",
    lat: 43.2128,
    lng: 2.3537,
    plus_beaux_villages: "non",
    notes: "cité médiévale emblématique",
  },
  {
    id: "saint-guilhem-le-desert",
    nom: "Saint-Guilhem-le-Désert",
    slug: "saint-guilhem-le-desert",
    departement: "Hérault",
    ancienne_region: "Occitanie",
    lat: 43.7333,
    lng: 3.55,
    plus_beaux_villages: "oui",
    notes: "village médiéval",
  },
  {
    id: "collioure",
    nom: "Collioure",
    slug: "collioure",
    departement: "Pyrénées-Orientales",
    ancienne_region: "Occitanie",
    lat: 42.5256,
    lng: 3.0819,
    plus_beaux_villages: "oui",
    notes: "village de bord de mer",
  },
  {
    id: "olargues",
    nom: "Olargues",
    slug: "olargues",
    departement: "Hérault",
    ancienne_region: "Occitanie",
    lat: 43.5561,
    lng: 2.9092,
    plus_beaux_villages: "oui",
    notes: "village pittoresque",
  },
];
