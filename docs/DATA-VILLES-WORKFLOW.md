# Données par ville : template minimal et marche à suivre

Document de référence à partir de l’échange avec l’observateur. Objectif : **un tableau léger** (colonnes utiles à l’algo), **données objectives en automatique** (APIs), **toi tu fais** : liste des lieux, score beauté (et 2–3 scores), + photos.

**Workflow pratique (ajouter des villes)** → voir **[WORKFLOW-EXCEL-CARTE.md](./WORKFLOW-EXCEL-CARTE.md)**. En bref : tu édites **data/cities/data-villes.xlsx** (colonne **nom** au minimum), tu enregistres, tu fermes Excel, tu rafraîchis la page Carte villes ; l’app enrichit et réécrit le même fichier (population, description, lat, lng, etc.). Pas besoin de cities-maitre.csv pour éditer.

---

## 1. Récap stratégique (observateur)

- **500 communes** bien choisies suffisent pour lancer (règle 80/20).
- **Données objectives** → APIs / open data (pas d’IA qui invente).
- **Scores qualitatifs** (charme, beauté, etc.) → toi, ou IA en batch avec grille stricte si tu veux plus tard.
- **Fêtes / événementiel** → le plus risqué en automatique ; soit sources officielles, soit saisonnier approximatif.
- **Photos** : 1 hero minimum par lieu ; convention `public/voyage/villes/{slug}/hero.jpg`.

---

## 2. Template Excel / CSV minimal (colonnes pour l’algo)

Seulement les colonnes **nécessaires au moteur** et à l’affichage. Le reste peut venir plus tard.

### 2.1 Colonnes à remplir ou déduire

| Colonne | Rôle | Rempli par | Note |
|--------|------|------------|------|
| **id** | Identifiant unique | Toi ou auto (slug) | ex. `saint-cirq-lapopie` |
| **nom** | Nom affiché | Toi (liste) | ex. Saint-Cirq-Lapopie |
| **slug** | URL / dossier photos | Auto ou toi | minuscules, tirets, sans accents |
| **departement** | Filtre région | Toi ou API | ex. Lot |
| **ancienne_region** | Blasons / branding | Toi | ex. Midi-Pyrénées |
| **lat** | Carte, distances | **Mapbox** | |
| **lng** | Carte, distances | **Mapbox** | |
| **population** | Taille, ambiance | **INSEE** | |
| **description** | Teaser / fiche lieu | **Wikipedia** (extrait) | optionnel court |
| **score_beaute** | Pondération algo | **Toi** | 0–10, grille cohérente |
| **score_taille** | Village vs ville | **Toi** (optionnel) | 0 = hameau, 10 = grande ville |
| **score_mer** | Env. préféré | Toi ou dérivé | 0–10 |
| **score_montagne** | Env. préféré | Toi ou dérivé | 0–10 |
| **score_campagne** | Env. préféré | Toi ou dérivé | 0–10 |
| **score_ville** | Env. préféré | Toi ou dérivé | 0–10 |
| **fete_village** | Différenciation | Toi ou calendrier | oui/non |
| **dates_fetes** | Matching dates voyage | Toi | ex. 15 août, 1er week-end juillet |
| **acces_sans_peage** | Contrainte dure | Toi ou script (OpenRouteService) | oui/non |
| **score_coin_paume** | Éviter / rechercher | Toi | 0–10 |
| **score_metropole** | Éviter grosses villes | Toi | 0–10 |
| **prix_moyen_airbnb** | Budget | Toi ou scraping ciblé | optionnel |
| **ville_jumelle_italie** | Signature | Toi | ex. Colmar ↔ Venise |
| **notes** | Éditorial | Toi | libre |

Les scores “env” (mer, montagne, campagne, ville) peuvent être **dérivés** plus tard à partir de distances (distance_mer_km, distance_montagne_km) + une règle, pour alléger la saisie au début.

### 2.2 Template CSV (en-têtes à copier dans Excel)

```
id,nom,slug,departement,ancienne_region,lat,lng,population,description,score_beaute,score_taille,score_mer,score_montagne,score_campagne,score_ville,fete_village,dates_fetes,acces_sans_peage,score_coin_paume,score_metropole,prix_moyen_airbnb,ville_jumelle_italie,notes
```

Version encore plus minimaliste pour démarrer (tu complètes le reste après) :

```
nom,departement,ancienne_region,score_beaute,score_taille,fete_village,dates_fetes,acces_sans_peage,notes
```

→ Les colonnes **lat, lng, population, description, slug** sont alors remplies par un **script interne** qui appelle Mapbox + INSEE + Wikipedia.

---

## 3. APIs à utiliser en interne (sans rien faire à la main)

### 3.1 Mapbox (déjà dans le projet)

- **Usage** : nom de commune → coordonnées.
- **Endpoint** : `GET /api/geocode?q=Marseille` (ton app) ou directement Mapbox Geocoding v6.
- **Retour** : `lat`, `lng`, `name`.
- **Rôle** : remplir **lat**, **lng**, et confirmer **nom** (et déduire **slug** : nom normalisé en minuscules, tirets, sans accents).

Tu n’as rien à saisir : tu mets le **nom** (et éventuellement département pour les homonymes), le script appelle l’API et remplit lat/lng/slug.

### 3.2 INSEE (population + localisation)

- **Usage** : code commune → population, nom officiel, département, région.
- **API** : API Sirene ou **API Communes** (data.gouv / INSEE).
  - Ex. démo : `https://api.insee.fr/metadonnees/nomenclatures/v1/geo/communes` (avec token) ou jeux de données **populations légales** en CSV (téléchargeables une fois, puis jointure par code commune).
  - L’**API Découpage administratif** ou **Base officielle des codes postaux** (La Poste) donne aussi code insee + nom + département.
- **Rôle** : remplir **population** (et optionnellement département / région si tu veux vérifier).

En pratique : un script qui, pour chaque **nom + département** (ou code Insee), récupère la population et met à jour la ligne. Pas de saisie manuelle.

### 3.3 Wikipedia (description courte)

- **Usage** : nom de la commune (+ département si homonyme) → extrait texte de l’article (1–2 phrases).
- **API** : `https://fr.wikipedia.org/w/api.php` avec `action=query&prop=extracts&exintro&explaintext&exsentences=2`.
  - Paramètres : `titles=Saint-Cirq-Lapopie` (ou `Saint-Cirq-Lapopie (Lot)`).
- **Rôle** : remplir **description** pour le teasing / la fiche lieu. Si pas d’article ou extrait vide, laisser vide ou “À rédiger”.

Tu ne rédiges pas la description : le script la récupère ; tu peux corriger à la main les cas importants.

---

## 4. Marche à suivre rapide par village (ce que tu fais toi)

Objectif : **~5–10 min par lieu** une fois le pipeline en place.

1. **Liste**  
   Tu ajoutes une ligne avec au minimum : **nom**, **departement**, **ancienne_region** (si tu l’utilises tout de suite).

2. **Script / outil interne** (à coder une fois)  
   Pour chaque ligne sans lat/lng/population/description :
   - Appel Mapbox → **lat**, **lng**, **nom** normalisé, **slug**.
   - Appel INSEE → **population** (et éventuellement vérif département).
   - Appel Wikipedia → **description** (extrait court).
   Tu ne fais pas ces étapes à la main.

3. **Toi**  
   - **Score beauté** (0–10) avec une grille fixe (ex. 0–2 faible, 3–4 sympa, 5–6 joli, 7–8 très beau, 9–10 exceptionnel).
   - **Score taille** (optionnel) : 0 = hameau, 5 = village, 10 = grande ville.
   - **Fête de village** : oui/non + **dates_fetes** si tu les connais.
   - **Accès sans péage** : oui/non (ou laisser vide et remplir plus tard avec un script OpenRouteService).
   - **Notes** / **ville_jumelle_italie** si pertinent.

4. **Photos**  
   - Un dossier par lieu : `public/voyage/villes/{slug}/`.
   - Au minimum **hero.jpg** (ou hero.webp). Optionnel : fete.jpg, rue.jpg, nature.jpg, surprise.jpg.
   - Tu déposes les fichiers ; pas besoin de colonne “photo” dans l’Excel si l’app déduit l’URL à partir du slug.

Résumé : **tu gères la liste + les scores beauté (et 2–3 scores) + les photos**. Le reste (coords, population, description) vient des APIs via un script.

---

## 5. Grille de scoring (cohérence)

Pour que les scores restent comparables d’un village à l’autre :

- **Score beauté (0–10)**  
  - 0–2 : intérêt faible  
  - 3–4 : sympa  
  - 5–6 : joli  
  - 7–8 : très beau  
  - 9–10 : exceptionnel / parmi les plus beaux du département  

- **Score taille (0–10)**  
  - 0 : hameau  
  - 3 : petit village  
  - 5 : village vivant  
  - 7 : petite ville  
  - 10 : grande ville  

Tu peux garder cette grille dans ce doc ou dans un `ALGORITHM_SPEC.md` pour que l’algo et les futurs imports restent cohérents.

---

## 6. Ordre de mise en place recommandé

1. **Template CSV minimal** : nom, departement, ancienne_region, score_beaute, score_taille, fete_village, dates_fetes, acces_sans_peage, notes.
2. **Script ou page interne** qui, pour chaque ligne :
   - appelle Mapbox (nom + département si besoin) → lat, lng, slug ;
   - appelle INSEE (ou fichier populations) → population ;
   - appelle Wikipedia (extrait) → description.
3. **Import / export** : Excel ↔ JSON ou CSV pour alimenter `data/cities/` ou Supabase.
4. **Toi** : tu remplis les scores et les photos au fil de ta sélection (listes départementales, Plus Beaux Villages, etc.).

Ainsi, tu ne passes pas des heures à récupérer géographie et description à la main : les APIs le font ; tu te concentres sur la curation (liste, beauté, fêtes, photos).

---

## 7. Où stocker le fichier Excel / CSV

- **Dans le projet** : `data/cities/` (dossier déjà prévu pour les données villes).
- **Fichiers suggérés** :
  - **Source (ce que tu édites)** : `data/cities/cities-source.csv` ou `cities-source.xlsx` — tu n’y mets que les colonnes que tu remplis (nom, departement, score_beaute, etc.).
  - **Enrichi (généré par le script)** : `data/cities/cities-sud.json` ou `cities-enriched.csv` — le script y écrit les lignes avec lat, lng, population, description, slug remplis par les APIs.
- **Pourquoi CSV en plus d’Excel** : le script lit/écrit plus facilement du CSV ou du JSON ; tu peux garder un Excel pour travailler à la main et exporter en CSV avant de lancer le script, ou utiliser uniquement un CSV éditable dans Excel.

---

## 8. Remplissage “automatique” : comment ça marche vraiment

**Excel ne remplit pas tout seul les colonnes via les APIs.** Il n’y a pas de formule Excel qui appelle Mapbox ou Wikipedia.

Le flux réel :

1. Tu maintiens un fichier (Excel ou CSV) avec au minimum la colonne **nom** (et idéalement **departement** pour les homonymes).
2. Tu lances un **script** (Node/Next, ou petit outil en ligne de commande) qui :
   - lit ce fichier ;
   - pour chaque ligne (ou chaque ligne sans lat/lng) : appelle Mapbox → lat, lng, slug ; INSEE → population, département, région ; Wikipedia → description ;
   - écrit le résultat dans un **nouveau fichier** (CSV ou JSON) avec toutes les colonnes remplies, ou met à jour le fichier.
3. Tu ouvres le fichier enrichi pour vérifier, et tu complètes à la main : score_beaute, score_taille, fête, accès sans péage, notes, etc.

Donc : **oui, les colonnes seront remplies “automatiquement” par les APIs, mais via un script à coder une fois**, pas par Excel tout seul. Pour un test avec **une seule ville** : même principe — une ligne avec juste le nom, le script tourne sur cette ligne et remplit loc, pop, département, région, description.

---

## 9. Convention de nommage et stockage des photos

- **Emplacement** : `public/voyage/villes/{slug}/`
  - `slug` = identifiant de la commune : **minuscules, tirets, sans accents** (ex. `saint-cirq-lapopie`, `marseille`). C’est le même slug que dans le tableau (déduit par le script à partir du nom).
- **Fichiers par dossier** :
  - **hero.jpg** (ou **hero.webp**) — obligatoire : image principale du teasing.
  - Optionnel : **fete.jpg**, **rue.jpg**, **nature.jpg**, **surprise.jpg** (pour galerie ou quiz plus tard).
- **Format** : JPG ou WebP recommandé. Pas d’espace ni de caractères spéciaux dans le nom de fichier.
- L’app déduit l’URL : `/voyage/villes/{slug}/hero.jpg`. Aucune colonne “photo” nécessaire dans l’Excel si on utilise toujours ce chemin.

Exemple pour un test avec une ville “Marseille” (slug `marseille`) :

```
public/voyage/villes/marseille/
  hero.jpg
  (optionnel : rue.jpg, nature.jpg, …)
```

---

## 10. Test avec une seule ville

1. Crée un CSV (ou une feuille Excel) avec **une seule ligne** et une colonne **nom** (ex. `Marseille`).
2. Lance le script d’enrichissement sur ce fichier (à coder : lit la ligne, appelle Mapbox avec `q=Marseille`, INSEE pour la commune correspondante, Wikipedia pour l’extrait).
3. Le script écrit une ligne complète avec : **nom, slug, lat, lng, population, departement, region, description** (et colonnes vides pour score_beaute, fete_village, etc.).
4. Tu remplis à la main : score_beaute, score_taille, et tu déposes **hero.jpg** dans `public/voyage/villes/marseille/`.

Une fois ce flow validé sur une ville, tu peux ajouter d’autres lignes (noms seuls) et relancer le script.

---

## 11. APIs tierces : Airbnb, festivals, fêtes de village

### 11.1 Prix Airbnb (moyenne saison)

- **API officielle Airbnb** : **il n’existe pas d’API publique** donnant les prix des hébergements. Les solutions type “API Airbnb” pour des tiers sont soit inexistantes, soit non officielles (scraping, reverse engineering), avec des risques juridiques et d’instabilité.
- **En pratique** : pour le MVP, laisse la colonne **prix_moyen_airbnb** vide ou remplie **à la main** (estimation par ville après une recherche rapide). Plus tard, on peut envisager des agrégateurs / comparateurs d’hébergement s’ils proposent une API (souvent payante). Pas d’automatisation “propre” côté Airbnb.

### 11.2 Festivals connus (France)

- **Oui, des données ouvertes existent** :
  - **Panorama des festivals** (ministère de la Culture) : [data.culturecommunication.gouv.fr](https://data.culturecommunication.gouv.fr/explore/dataset/panorama-des-festivals/api/) — nombreux festivals, avec géolocalisation possible ; jeu de données de 2018 (plus mis à jour).
  - **Liste des festivals en France** (data.gouv.fr) : critères “au moins 2 éditions, multi-jours, 5+ événements”, avec **code commune** pour faire le lien avec tes lignes.
- Un script peut : télécharger ce jeu de données (CSV/API), faire une jointure sur le **code commune INSEE** (ou nom + département), et remplir **festival_bool** et **dates_festival** (ou **nom_festival**) pour les festivals les plus connus. Les dates sont souvent “récurrentes” (ex. “juillet”) plutôt que précises jour pour jour.

### 11.3 Fêtes de village

- **Pas de base nationale unique** “toutes les fêtes de village”. Les données sont **fragmentées** : par région (ex. API “agenda Aquitaine” sur data.gouv), par office de tourisme, ou listes non structurées.
- **Options** :
  - Utiliser les **festivals** (open data) pour les événements “connus” et laisser **fete_village** / **dates_fetes** en saisie **manuelle** pour les petites fêtes locales.
  - Ou intégrer une source régionale (API ou CSV) si tu te concentres sur le Sud ; les champs restent **fete_village** (oui/non) et **dates_fetes** (texte libre ou date approximative).

### 11.4 Plus Beaux Villages de France

- **Pas d’API temps réel** officielle : l’association ne publie pas de service API.
- **Jeu de données open data** : sur **data.gouv.fr**, dataset [Plus beaux villages de France (juillet 2023)](https://www.data.gouv.fr/datasets/plus-beaux-villages-de-france-juillet-2023) — liste des communes labellisées, téléchargeable en CSV/JSON. On peut faire une **jointure** (nom de commune ou code INSEE) pour remplir la colonne **plus_beaux_villages** (oui/non) automatiquement.

Résumé : **loc, pop, département, région, description** = automatisables (Mapbox, INSEE, Wikipedia). **Festivals connus** = oui via open data Culture / data.gouv. **Plus Beaux Villages** = oui via dataset data.gouv (pas d’API live). **Prix Airbnb** = pas d’API officielle ; manuel ou vide pour le MVP. **Fêtes de village** = partiel (régional) ou manuel.
