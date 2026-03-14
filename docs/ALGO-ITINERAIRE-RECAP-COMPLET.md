# Récapitulatif complet : algorithme d’itinéraire

**Document destiné à un observateur extérieur** : ce fichier décrit le contexte du projet, les données disponibles et la conception algorithmique détaillée de la génération d’itinéraires. L’objectif est de permettre des retours et suggestions sur le design technique.

---

## CONTEXTE DU PROJET

### Qu’est-ce que « Voyage voyage » ?

**Voyage voyage** est un assistant de voyage intelligent pour la planification de road trips en van, centré sur la France. Il se distingue :

- **Conception en amont** : génération d’itinéraires personnalisés selon le profil utilisateur (plutôt que documentation après coup).
- **Personnalisation** : quiz d’identité + quiz pré-voyage → itinéraires vraiment différents d’un utilisateur à l’autre.
- **Ciblage vanlife** : tout est pensé pour ce mode (campings, Park4night, pas d’autoroute, rythme lent).
- **Effet « agence de voyage »** : pages villes qualitatives, descriptions adaptées au profil, photos curatées.

L’utilisateur fournit : point de départ, point d’arrivée (ou boucle), durée, préférences (plages, randos, villages, patrimoine, etc.). L’algorithme génère un itinéraire optimisé qui maximise la qualité des visites tout en respectant des contraintes de cohérence géographique et de budget km.

### Ce qui existe déjà

| Composant | État | Description |
|-----------|------|-------------|
| **Base de lieux** | ✅ Implémenté | `lieux-central.xlsx` (3 onglets : Patrimoine, Plages, Randos), ~15–50 points par département selon le tier |
| **Scoring** | ✅ Implémenté | `lib/score-lieux.ts` — score composite selon profil (esthétique, notoriété, tags, préférences plages/randos) |
| **Proportions** | ✅ Implémenté | `applyProportions()` — quotas par catégorie avec marge +10 % (villages, villes, châteaux, plages, randos, musées) |
| **Clustering DBSCAN** | ✅ Implémenté | `lib/itinerary/dbscan.ts` |
| **TSP** | ✅ Implémenté | `lib/itinerary/tsp.ts` (ordonnancement) |
| **Corridor** | ✅ Implémenté | `lib/itinerary/corridor.ts` — filtre points dans un couloir S→E |
| **Génération** | ⚠️ Partiel | `lib/itinerary/generate.ts` — pipeline actuel : DBSCAN → TSP clusters → TSP intra-cluster → nuits (van/airbnb selon maxAirbnbNights). Pas encore aligné avec la conception ci-dessous |

### Ce qui est en conception (ce document)

L’algorithme actuel est une première version. La conception ci-dessous vise à :

1. **Structurer l’itinéraire autour d’une épine** (ligne I/C/S/J) reliant des clusters d’incontournables, plutôt qu’un simple corridor S→E.
2. **Maximiser le score cumulé** sous contrainte de budget km, sans retours en arrière ni micro-boucles.
3. **Répartir le budget km** par segment (base + bonus densité).

4. **Intégrer une matrice zone×catégorie** pour orienter la sélection vers les zones fortes pour chaque type (ex. éviter 20 % de randos dans un département sans randos).
5. **Gérer les insertions** par rapport à l’arête courante (épine + villes déjà ajoutées), pas par rapport à l’épine seule.

### Retour d’audit intégré (résumé)

**Points forts** : structuration par épine (reproduit la planification humaine), insertion sur l’arête courante (heuristique standard route planning), corridor (évite micro-boucles), plancher budget km (distance_directe × 2), matrice zone×catégorie avec sqrt(densité).

| Critère | Note | Commentaire |
|---------|------|-------------|
| Architecture | 9/10 | Épine + répartition + remplissage — bien aligné avec la planification humaine |
| Compréhension du problème | 9/10 | TOP / Team Orienteering Problem |
| Faisabilité technique | 9/10 | Pipeline ~2000 lieux en < 500 ms |
| Robustesse heuristique | 8/10 | Risque de rigidité trop forte (contraintes cumulées) |
| Simplicité | 7/10 | — |

**Risque principal** : rigidité — spine + clusters + corridor + quotas + direction penalty + formes I/C/S/J peuvent trop restreindre l’espace de solution. → **Multi-start spine** est l’amélioration la plus rentable.

### Ce dont on dispose techniquement

- **Stack** : Next.js, TypeScript, Supabase (optionnel)
- **APIs** : Mapbox (Directions, Geocoding), OpenAI (descriptions)
- **Données** : Excel (lieux-central), JSON (profils départements, classement, tiers)
- **Distances** : haversine pour le tri et les insertions (rapide, suffisant pour comparer). Mapbox Directions pour la phase finale (ordre définitif, km réels) — en montagne, 10 km à vol d’oiseau peuvent représenter 40 km de route.

### Ce que l’observateur peut apporter

- Suggestions sur la formulation du problème d’optimisation.
- Alternatives algorithmiques (ex. programmation linéaire, heuristiques, ordre des phases).
- Points aveugles ou cas non couverts.
- Simplifications possibles sans perdre l’essentiel.
- Validation de la cohérence entre données disponibles et objectifs.

---

## I. DONNÉES DISPONIBLES

### 1.1 Maillage et sources

| Source | Contenu | Granularité |
|--------|---------|-------------|
| **lieux-central.xlsx** | Patrimoine, Plages, Randos | 3 onglets, ~15–50 points/département |
| **Supabase** (si utilisé) | Lieux enrichis, descriptions | Même granularité, enrichi |
| **Départements** | 96 métropolitains (ou sous-ensemble) | Zone = département (code_dep) |

**Maillage géographique** : le découpage naturel est le **département** (code_dep). Pour la matrice zone × catégorie, on utilise le département comme zone. Alternative : grille (ex. cellules 30×30 km) si besoin de plus de finesse.

### 1.2 Densité estimée

| Zone | Points / 100 km² (ordre de grandeur) |
|------|-------------------------------------|
| France entière | ~0,3–0,5 (2400 points / 550 000 km²) |
| Département moyen (~6000 km²) | ~20–50 points |
| Zone dense (ex. 04, 13, 84) | ~1–2 points / 100 km² |
| Zone sparse (ex. Creuse) | ~0,1–0,3 |

*Note* : la densité varie fortement selon le tier du département (S/A/B/C/D) et la présence de plages/randos.

### 1.3 Informations par point (LieuLigne / LieuScore)

| Champ | Type | Rôle |
|-------|------|------|
| **id** | string | Identifiant unique |
| **nom, slug** | string | Identité |
| **lat, lng** | number | Coordonnées (obligatoires pour la carte) |
| **code_dep, departement** | string | Zone géographique |
| **source_type** | string | "patrimoine" \| "plage" \| "rando" |
| **famille_type** | FamilleType | ville, village, musee, rando, chateau, abbaye, site_naturel, patrimoine, plage, autre |
| **bucketFamille** | string | Clé pour proportions (plage, rando, ville, village, chateau, musee, etc.) |
| **score** | number | Score composite (profil + tags + préférences) |
| **score_esthetique** | 0–10 | Beauté (villes/villages/patrimoine) |
| **score_notoriete** | 1–10 | Notoriété (1=très connu, 10=peu connu) — converti en "connu" |
| **plus_beaux_villages** | "oui" \| "non" | Label PBVF |
| **tags_architecture, tags_cadre** | string | Tags pour matching profil |
| **categorie_taille** | string | grande_ville, village, petite_ville, etc. |
| **population** | number | Pour villages/villes |
| **type_plage** | string | sable, galets, plage_lac, etc. |
| **surf, naturiste, familiale** | oui/non | Préférences plages |
| **niveau_souhaite, difficulte** | string | Rando |
| **denivele_positif_m, distance_km, duree_estimee** | string/number | Rando |
| **facteurs** | string[] | Trace du scoring |
| **selectionTrace** | string[] | Trace de sélection (quota, etc.) |

### 1.4 Profil utilisateur (ProfilRecherche)

- **departements** : codes départements ciblés
- **famillesIncluses** : plage, rando, village, ville, chateau, musee, etc.
- **proportionsAmbiance** : plages, randos, chateaux, villages, villes, musees (%)
- **pepitesPourcent** : curseur pépites vs classiques
- **eviterGrandesVilles** : booléen
- **plageTypes, plageSurf, plageNaturiste, plageFamiliale**
- **randoNiveauSouhaite, randoDuree, randoDenivele**
- **tagsCadre, tagsArchitecture** : préférences
- **maxAirbnbNights** : nombre max de nuits en Airbnb toléré (0 = tout van, undefined = pas de limite) — utilisé dans assignNights pour van vs airbnb

---

## II. ALGORITHME — VUE D’ENSEMBLE

```
Phase 0 : Préparation (budget, matrice zone×catégorie)
Phase 1 : Incontournables → Clusters → Épine
Phase 2 : Répartition du budget km par segment d’épine
Phase 3 : Remplissage par segment (insertion gloutonne)
Phase 4 : Ordre intra-cluster (TSP entrée/sortie)
Phase 5 : Validation forme (I/C/S/J), 2-opt, nuits
```

---

## III. PHASE 0 — PRÉPARATION

### 3.1 Budget km total

```
jours_de_route = total_nuits − nuits_sur_place_consecutives  (ou approximation)
budget_total = max(
  jours_de_route × km_max_par_jour,
  distance_directe(S→E) × 2.0
)
```

- **Jours de route** : on retire un jour si deux nuits consécutives au même endroit (pas de déplacement ce jour-là).
- **Plancher** : `distance_directe × 2.0` évite un budget trop faible pour des trajets longs en peu de nuits (ex. Paris → Nice en 3 nuits).

### 3.2 Matrice zone × catégorie

Pour chaque **département** Z et chaque **catégorie** C (chateau, rando, village, ville, plage, musee, etc.) :

1. **Densité** : nombre de points de catégorie C dans Z
2. **Qualité** : score moyen (ou somme) des points de catégorie C dans Z
3. **Force** : `force(Z, C) = densité × qualité` (ou variante)
4. **Poids relatif** : `poids(Z, C) = force(Z, C) / max_Z force(Z, C)` ∈ [0, 1]

Zones sans points dans une catégorie → `poids(Z, C) = 0`.

### 3.3 Score effectif (bonus zone, pas de pénalité)

```
score_effectif(point) = score(point) × (1 + β × max(0, poids(zone, catégorie) − 0,5))
```
- β ≈ 0,2–0,3
- Seuil 0,5 : en dessous, pas de modification
- Pas de pénalité pour les zones faibles

**⚠️ Amélioration (feedback)** : utiliser `sqrt(densité)` plutôt que densité brute pour le calcul de la force. Sinon les zones très denses (Alpes, Côte d'Azur) dominent trop. Exemple : `force = sqrt(densité) × qualité`.

---

## IV. PHASE 1 — ÉPINE (STRUCTURE GLOBALE)

### 4.1 Incontournables

- Lieux marqués **incontournable** (profil) ou top priorité
- Ou : top X % par score dans les catégories pertinentes (villes, villages, châteaux)
- Règle 80 % : applicable surtout aux villes/villages classiques et incontournables

### 4.2 Clustering des incontournables

- **Algorithme** : DBSCAN
- **Distance** : haversine (km)
- **eps adaptatif** : `eps = médiane(distances aux k plus proches voisins) × facteur` — s’adapte à la géographie (Bretagne vs Alpes). Valeur de repli : 30–50 km si calcul impossible.
- **minPts** : 1 ou 2

**⚠️ Problème DBSCAN (feedback)** : DBSCAN n'aime pas les distributions linéaires (ex. vallée de la Loire, châteaux espacés régulièrement). Il peut créer plein de petits clusters. **Alternatives** : clustering hiérarchique par distance, ou **greedy clustering** : prendre point top score → former cluster radius R → retirer points → recommencer. Plus stable pour les trajets linéaires.

### 4.3 Réduction du nombre de clusters

Si trop de clusters (> 6–8) :
- Prioriser par score cumulé des incontournables
- Fusionner les clusters les plus proches
- Abandonner les clusters les moins intéressants (sauf force majeure distance)

### 4.4 Tracé de l’épine

- Ligne brisée reliant les clusters (centroïdes)
- **Formes autorisées** : I, C, S, J
- **Formes interdites** : U, M (retours, micro-boucles)
- Vérifier que la longueur de l’épine ≤ budget

### 4.5 Segments d’épine

Chaque segment = tronçon entre deux points d’ancrage (cluster ou S/E).

---

## V. PHASE 2 — RÉPARTITION DU BUDGET PAR SEGMENT

Pour éviter qu’un segment très dense absorbe tout le budget :

```
base = budget_total / nb_segments
bonus = α × (densité_normalisée × budget_restant)
budget(segment_j) = base + bonus
```

- **base** : plancher garanti pour chaque segment.
- **bonus** : proportionnel à la densité (nombre de candidats ou somme des scores dans le corridor).
- α : facteur de pondération (ex. 0,3–0,5).

Segments riches reçoivent plus, segments pauvres gardent au moins la base.

---

## VI. PHASE 3 — REMPLISSAGE PAR SEGMENT

### 6.1 Corridor par segment

- **Largeur** : `largeur = clamp(k × longueur(segment), 15, 60)` km
- k ≈ 0,3–0,5
- **Contraintes** : `largeur ≤ budget_segment / 3` et `largeur ≤ budget_segment / 2` (évite pool énorme ; segments courts ne captent pas trop de points latéraux). Voir §12.4.
- Bande de part et d’autre du segment

### 6.2 Pool par segment

- Candidats dont la projection sur le segment est dans le corridor (distance perpendiculaire ≤ largeur/2)
- Filtrés par famillesIncluses et proportions (quotas par catégorie)

### 6.3 Insertion gloutonne — point clé

**Arête de référence** : à chaque étape, c’est l’**arête courante** (épine + toutes les villes déjà insérées), pas l’épine initiale.

**Pour chaque candidat** :
1. Trouver la **meilleure position d’insertion** sur l’arête courante (entre deux points consécutifs)
2. Calculer le **détour** : `(A→nouveau) + (nouveau→B) − (A→B)`
3. Calculer la **pénalité de direction** : `direction_penalty = 1 + γ × angle_recul` (angle entre le segment actuel et le vecteur vers le nouveau point ; pénalise les retours arrière)
4. Calculer le **ratio** : préférer un modèle **additif** plutôt que multiplicatif (évite l’explosion des ratios) :
   - `ratio = score_effectif / (détour + α × distance_spine)` — voir §12.5

**Sélection** :
- Trier les candidats par ratio décroissant
- Filtrer par quotas (catégorie avec quota restant)
- Choisir le meilleur qui respecte le budget du segment
- L’insérer à sa meilleure position
- Mettre à jour l’arête courante et les quotas
- Répéter jusqu’à budget épuisé ou plus de candidats rentables

**Diversité** (recommandé) : éviter 10 villages médiévaux d’affilée — `diversity_penalty` si deux points consécutifs ont la même catégorie.

**Effet** : un village proche du cluster suivant est naturellement inséré près de ce cluster (détour minimal). Pas de scan progressif — on prend les meilleurs sur toute la ligne.

### 6.4 Proportions

- Quotas par catégorie (plages, randos, châteaux, villages, villes, musées)
- **Marge sur quotas** (implémenté) : +10 % par catégorie pour éviter de casser l’optimisation (quota strict → sous-optimal)
- **Soft quotas** (recommandé) : `score_effectif × bonus_quota` si catégorie sous-représentée, plutôt que filtre dur — évite de forcer des musées mauvais si quota musée = 2

---

## VII. PHASE 4 — ORDRE INTRA-CLUSTER

Pour chaque cluster (ensemble de points dans une zone dense) :

1. **Entrée** : point le plus proche du segment/cluster précédent
2. **Sortie** : point le plus proche du segment/cluster suivant
3. **TSP** (ou plus proche voisin) avec entrée et sortie fixées
4. Parcours cohérent, pas de zigzag

---

## VIII. PHASE 5 — FINALISATION

### 8.1 2-opt et distances finales

- Supprimer les croisements évidents sur le tracé final
- **Distances** : pour l’ordre définitif et l’estimation des km réels, utiliser Mapbox Directions (haversine utilisé en phase de tri/insertion). En montagne, appliquer terrain_factor (Alpes=1,8, Massif central=1,5, plaine=1,2) — voir §12.7

### 8.2 Validation forme (I/C/S/J vs U/M)

- **Règle simple** : interdire un angle > 150° entre segments consécutifs (indique un retour arrière).
- Rejeter ou corriger les insertions qui violent cette règle.

### 8.3 Placement des nuits

- assignNights(orderedPoints, totalNights, rythme, { maxAirbnbNights })
- Étapes dodo après chaque journée
- **maxAirbnbNights** (implémenté) : si lieu nuitSurPlace (ville/village) et budget Airbnb > 0 → nuiteeType = "airbnb", sinon "van"
- **target_km_per_day** (recommandé) : répartir les nuits selon cumul km pour éviter jour 1 = 50 km, jour 2 = 350 km

### 8.4 Règle 80 % (optionnelle)

- Pour villes/villages/incontournables : vérifier que ≥ 80 % du top X % est visité
- Si non : prioriser les manquants

---

## IX. SYNTHÈSE DES SUBTILITÉS

| Élément | Détail |
|---------|--------|
| **Arête de référence** | Toujours l’arête courante (épine + insertions), jamais l’épine seule |
| **Score effectif** | Bonus zone (pas de pénalité) : `score × (1 + β × max(0, poids − 0,5))` ; `sqrt(densité)` pour la force zone×catégorie |
| **Matrice zone×catégorie** | Poids relatif par département et par catégorie |
| **Proportions** | Quotas par catégorie avec marge +10 % ; soft quotas recommandés (§12.6) |
| **Ratio insertion** | Additif préféré : `score_effectif / (détour + α × distance_spine)` — plus stable que multiplicatif |
| **Diversité** | Pénalité si deux points consécutifs même catégorie (recommandé) |
| **Largeur corridor** | Proportionnelle à la longueur du segment, bornée ; `largeur ≤ budget_segment / 3` |
| **Budget par segment** | Base + bonus densité (évite qu’un segment absorbe tout) |
| **Clusters** | DBSCAN actuel ; greedy clustering recommandé pour distributions linéaires (§12.3) |
| **Pénalité direction** | `1 + γ × angle_recul` dans le ratio pour éviter les retours arrière |
| **Formes** | I, C, S, J autorisées ; U, M interdites |
| **Nuits** | maxAirbnbNights (implémenté) ; target_km_per_day (recommandé) |

---

## X. DONNÉES MANQUANTES / À PRÉCISER

| Élément | État |
|---------|------|
| Définition précise « incontournable » | Profil + marquage explicite ; seuil à calibrer |
| Validation I/C/S/J | Règle angle > 150° entre segments consécutifs |
| Réallocation budget entre segments | Non défini (transfert si sous/sur-utilisation ?) |
| Grille vs département pour zones | Département suffit pour matrice zone×catégorie |

---

## XI. RÉSUMÉ POUR L’OBSERVATEUR

Ce document décrit la conception d’un algorithme de génération d’itinéraires pour une app de planification de voyages en van en France. L’objectif est de produire un trajet cohérent (forme I/C/S/J, pas de retours) qui maximise le score cumulé des lieux visités sous contrainte de budget km.

**Données** : ~1500–2500 lieux (villages, villes, châteaux, plages, randos) répartis sur les départements français, avec scores personnalisables selon le profil utilisateur.

**Logique** : épine (clusters d’incontournables) → répartition du budget par segment → remplissage par insertion gloutonne (arête courante, score effectif, quotas) → ordre intra-cluster → finalisation.

**Points ouverts aux suggestions** :
- Formulation mathématique du problème (objectif, contraintes).
- Ordre et dépendances entre les phases.
- Gestion des cas limites (zones vides, épine impossible, budget insuffisant).
- Alternatives à l’insertion gloutonne (ex. programmation par contraintes, recuit simulé).
- Validation de la faisabilité avec les données actuelles.

---

## XII. FEEDBACK INTÉGRÉ — AMÉLIORATIONS À IMPLÉMENTER

*Retours d'analyse externe (Team Orienteering Problem, heuristiques, production).*

### 12.1 Formulation du problème

Le problème est une variante du **Team Orienteering Problem (TOP)** avec : graphe de lieux V, profit p_i (score), coût d_ij (distance), budget B ; contraintes ajoutées : quotas par catégorie, corridor géographique, structure spatiale (I/C/S/J), clusters d'incontournables, pénalité directionnelle. → Heuristiques gloutonnes + post-optimisation est la bonne approche.

### 12.2 Matrice zone × catégorie

**Utiliser** `sqrt(densité)` **plutôt que densité** brute pour la force : `force(Z, C) = sqrt(densité) × qualité`. Sinon les zones très denses (Alpes, Côte d'Azur, Provence) dominent trop.

### 12.3 DBSCAN / Clustering

**Problème** : DBSCAN n'aime pas les distributions linéaires (vallée de la Loire, châteaux espacés). Il crée plein de petits clusters. **Alternative** : greedy clustering — prendre point top score → former cluster radius R → retirer points → recommencer. Plus stable.

### 12.4 Corridor

**Largeur** : `largeur = min(k × longueur_segment, largeur_max, budget_segment / 2)`. Sinon les segments courts peuvent capturer trop de points latéraux.

### 12.5 Insertion gloutonne

**Ratio** : préférer un modèle **additif** plutôt que multiplicatif (évite l’explosion des ratios quand on multiplie plusieurs pénalités) :
```
ratio = score_effectif / (détour + α × distance_spine)
```
**Pénalités additionnelles** : (1) `distance_from_spine` = distance au segment principal. (2) Pénalité densité locale optionnelle. Les modèles additifs sont plus stables.

### 12.6 Quotas

**Marge** (implémenté) : +10 % sur chaque quota pour éviter de casser l’optimisation.

**Soft quotas** (recommandé) : `score_effectif × bonus_quota` si catégorie sous-représentée, au lieu de filtre dur. Les quotas stricts peuvent casser l’optimisation (ex. quota musées = 2 mais tous les musées ont score 3).

### 12.7 Haversine / terrain

**Problème** : en montagne, 10 km vol d'oiseau = 35 km route. **Solution** : `détour × terrain_factor` selon le département (Alpes=1,8, Massif central=1,5, plaine=1,2).

### 12.8 Budget segment

**Amélioration** : `budget(segment) ∝ somme_scores_candidats`. Un segment dense peut absorber plus de budget si les candidats sont bons.

### 12.9 Améliorations majeures (priorité)

| # | Amélioration | Effet |
|---|--------------|-------|
| 1 | **Multi-start spine** : 5–10 épines candidates (top score, diversification, orientation ouest/est, greedy cluster) → générer itinéraire pour chacune → garder le meilleur | Gain qualité énorme, sans complexifier l’algo |
| 2 | **Recuit simulé final** : swap/remove/add avec acceptation probabiliste | Échappe aux optima locaux |
| 3 | **Insertion par lot** : mini-cluster (village + rando) au lieu d'un point à la fois | Cohérence locale |

### 12.10 Diversité

**Problème** : éviter 10 villages médiévaux d’affilée. **Solution** : `diversity_penalty` si deux points consécutifs ont la même catégorie.

### 12.11 Distribution des nuits

**Problème** : assignNights peut produire jour 1 = 50 km, jour 2 = 350 km. **Solution** : `target_km_per_day` puis répartir les nuits selon cumul km.

### 12.12 Nuits van vs Airbnb (implémenté)

**maxAirbnbNights** : limite le nombre de nuits en Airbnb. Si lieu nuitSurPlace (ville/village) et budget restant > 0 → airbnb, sinon van. Décrémenter le budget à chaque nuit Airbnb.

### 12.13 Risques identifiés

1. **Rigidité** : spine + clusters + corridor + quotas + direction + formes — ensemble, trop restreindre l’espace de solution
2. Quotas trop durs (→ marge + soft quotas)
3. DBSCAN instable sur distributions linéaires (→ greedy clustering)

---

## XIII. ÉTAT D’IMPLÉMENTATION (pour audit)

| Élément | Statut | Fichier / note |
|---------|--------|----------------|
| Marge quotas +10 % | ✅ Implémenté | `lib/score-lieux.ts` applyProportions |
| maxAirbnbNights (van vs airbnb) | ✅ Implémenté | `lib/itinerary/nights.ts`, `generate.ts`, API |
| Ratio additif | ⏳ À faire | Actuellement multiplicatif dans le design |
| sqrt(densité) zone×catégorie | ⏳ À faire | — |
| Greedy clustering (vs DBSCAN) | ⏳ À faire | DBSCAN actuel |
| Soft quotas (bonus) | ⏳ À faire | Quotas stricts + marge actuellement |
| Diversity penalty | ⏳ À faire | — |
| target_km_per_day (nuits) | ⏳ À faire | — |
| Multi-start spine | ⏳ Priorité 1 | Gain qualité majeur |
| Recuit simulé final | ⏳ Optionnel | — |
