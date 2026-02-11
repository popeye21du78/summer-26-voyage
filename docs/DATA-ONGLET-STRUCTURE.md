# Structure de l’onglet Data – Van-Life Journal

## Ambiance DA « Terre Battue & Carnet de Route »

- **Typo** : IBM Plex Mono partout
- **Palette** : fond crème `#FAF4F0`, accents terracotta `#A55734` / foncé `#7a3d22`, tons doux `#c98b6a` pour trajets
- **Tableaux** : en-têtes terracotta pleine largeur, bordures `#7a3d22`, lignes alternées `#FFF2EB`
- **Badges / cartouches** : `rounded-full` terracotta pour les chiffres clés
- **Graphiques** : traits terracotta, fond crème, légères ombres et bordures

---

## Structure de la page

### 1. En-tête
- Titre : « Data & Logistique »
- Sous-titre : « Vue d’ensemble du voyage Summer 26 »

### 2. Bloc « Big Numbers » – Indicateurs principaux
Cartouches compactes, style badge terracotta :

| Indicateur | Description |
|------------|-------------|
| **Km totaux** | Somme des segments (Turf ou API directions) |
| **Km / jour** | Km totaux ÷ nombre de jours de voyage |
| **Prix / nuit moyen** | (Σ budget_nuitee) ÷ nombre de nuitées (Van + AirBnb) |
| **Villes / étapes** | Nombre d’étapes dans l’itinéraire |
| **Budget total prévu** | Somme culture + nourriture + nuitée |
| **Nuitées** | Total des nuitées (Van + AirBnb) |

### 3. Graphique – Évolution des dépenses dans le temps
- **Type** : courbe ou barres empilées par date
- **Axe X** : dates (arrivée par ville)
- **Axe Y** : montant en €
- **Séries** : Culture (terracotta clair), Nourriture (terracotta moyen), Nuitée (terracotta foncé)
- **Léger filigrane** si pertinent

### 4. Tableau récapitulatif par ville
Colonnes : Ville | Date arrivée | J+X | Nuitées | Culture € | Nourriture € | Nuitée € | Sous-total | Budget prévu

- Même style que le tableau Planning (en-têtes terracotta, bordures, lignes alternées)

### 5. Section « Trajets »
- Tableau : Ville A → Ville B | Km | Durée | Péages
- Données issues de `routeSegments` / API directions
- Style encart terracotta léger comme les trajets du Planning

### 6. Répartition du budget (pie ou barres)
- Culture / Nourriture / Nuitée en % ou barres horizontales
- Couleurs cohérentes avec le reste de la DA

---

## Stats supplémentaires envisagées

- **Durée totale du voyage** (premier départ → dernier départ)
- **Prix au km** (budget total ÷ km) – indicateur de coût du voyage
- **Moyenne dépenses / jour** (budget total ÷ nb jours)
- **Ecart Budget prévu vs prévisionnel** (si les données le permettent)

---

## Implémentation technique

- Données : fetch `/api/itinerary` (même source que Planning)
- Distances : `buildRouteGeoJSON` / `getSegmentInfo` ou API `/api/directions`
- Graphiques : Recharts (léger) ou SVG pur pour garder 0 dépendance
- Mise en page : grille responsive, cartouches en `flex-wrap`
