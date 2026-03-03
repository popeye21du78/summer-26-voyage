# Audit détaillé : biais de notation et méthodologie de scoring

**Date** : 25 février 2025  
**Contexte** : Profil Marc (Nouvelle-Aquitaine, Occitanie, 7 jours, 25% pépites)

**Mises à jour (25 fév.)** : Plages de lac corrigées, base esthétique châteaux/abbayes, patrimoine→ville/village pour cités, Île aux Oiseaux→site_naturel, Porto-Vecchio→2A.

---

## 1. Problème majeur : échelle des scores aberrante (ratio 500:1)

### Constat

Un village peut atteindre **10 028** points alors qu’une plage ou un château atteint **20** ou **0**. Le ratio dépasse 500:1.

### Cause (code : `lib/score-lieux.ts`)

| Famille | Base de score | Bonus typiques | Plage de scores |
|---------|----------------|----------------|------------------|
| **Ville, Village, Patrimoine** | `esthétique × 1000` (l.258-264) | +8 PBVF, +12 à +20 cadre | **8 000 – 10 040** |
| **Château, Abbaye** | Aucune | Tags cadre (poids×20), tags archi (+15) | **0 – 50** |
| **Plage** | Aucune | Tags cadre, type plage (+20/-6), surf/naturiste/familiale | **0 – 40** |
| **Rando** | Aucune | Niveau/durée/dénivelé (+10 à +15) | **0 – 35** |

Seules les familles `ville`, `village`, `patrimoine` reçoivent la base esthétique. Les châteaux, abbayes, plages et randos n’ont **aucune base**, uniquement des bonus de tags.

### Impact

- Les châteaux et plages sont systématiquement écrasés dans le tri.
- La répartition par proportions (14% plages, 14% châteaux, etc.) fonctionne, mais le tri interne au bucket reste dominé par des scores très faibles.
- L’écart 10 000 vs 20 n’a pas de sens sémantique : un château majeur (Montségur) à 0 et un village à 10 000 ne reflètent pas une différence de pertinence proportionnelle.

### Piste de correction

Introduire une **base commune** pour toutes les familles, par exemple :

- Châteaux/abbayes : `esthétique × 100` (ou × 500) si `score_esthetique` présent
- Plages : base fixe (ex. 500) + bonus cadre
- Randos : base selon difficulté/durée

Ou normaliser les scores par famille avant agrégation (z-score par bucket).

---

## 2. Châteaux à score 0 (Montségur, Peyrepertuse, Sylvanès)

### Constat

Montségur, Peyrepertuse, Sylvanès ont un score **0** alors qu’ils sont des sites majeurs.

### Cause

1. **Pas de base esthétique** pour les châteaux/abbayes (cf. §1).
2. **Tags cadre hors profil** :  
   - Montségur, Peyrepertuse : `tags_cadre = "moyenne_montagne"`  
   - Sylvanès : `tags_cadre = "foret"`  
   Le profil Marc a `plaine`, `vignoble`, `bord_de_mer`. Aucun match → 0 point de cadre.
3. Les tags architecture (`medieval`, `fortifie`, `gothique`) ne matchent que si le profil inclut `tagsArchitecture` correspondants.

### Fichiers concernés

- `lib/score-lieux.ts` (l.258-264) : base esthétique limitée à ville/village/patrimoine
- `data/cities/lieux-central.json` : Montségur, Peyrepertuse, Sylvanès

### Piste de correction

- Ajouter une base esthétique pour châteaux/abbayes (ex. `score_esthetique × 100`).
- Ou élargir les tags cadre du profil (ex. `moyenne_montagne`, `foret`) pour les profils « nature/culture ».

---

## 3. Plages : lac = bord de mer (Lac de Montbel)

### Constat

Le Lac de Montbel (Ariège) reçoit `bord_de_mer+20` alors que c’est un lac de montagne.

### Cause (code : `lib/score-lieux.ts` l.251-253)

```ts
if (lieu.source_type === "plage") {
  tagsCadreLieu.push("bord_de_mer", "lac");
}
```

Toutes les plages reçoivent **à la fois** `bord_de_mer` et `lac`. Une plage de lac (`type_plage: "plage_lac"`) matche donc `bord_de_mer` du profil et obtient +20.

### Piste de correction

Distinguer plages de mer et plages de lac :

```ts
if (lieu.source_type === "plage") {
  const typePlage = String(lieu.type_plage ?? "").toLowerCase();
  if (typePlage === "plage_lac") {
    tagsCadreLieu.push("lac");
  } else {
    tagsCadreLieu.push("bord_de_mer");
  }
}
```

---

## 4. Typage « Autre » pour Carcassonne, Sarlat, Rocamadour, Albi

### Constat

Ces lieux s’affichent comme « Autre » alors qu’ils sont clairement ville, village ou patrimoine.

### Cause

- En base : `famille_type = "patrimoine"` (Carcassonne, Sarlat, Rocamadour, Albi).
- L’affichage (`app/(main)/voyage/nouveau/page.tsx` l.273) ne prévoit pas de cas pour `patrimoine` :

```ts
ls.bucketFamille === "ville" ? "Ville" : 
ls.bucketFamille === "village" ? "Village" : 
ls.bucketFamille === "chateau" || ls.bucketFamille === "abbaye" ? "Château/Abbaye" : 
// ... pas de cas "patrimoine"
: "Autre"
```

Tout ce qui n’est pas ville, village, château, abbaye, musée, rando, plage tombe en « Autre ».

### Piste de correction

- Ajouter un cas `patrimoine` → « Patrimoine » (ou « Ville/Village » selon la logique métier).
- Ou revoir le typage en base : Carcassonne, Sarlat, Albi en `ville`, Rocamadour en `village` si plus cohérent.

---

## 5. Île aux Oiseaux typée « Ville »

### Constat

L’Île aux Oiseaux (bassin d’Arcachon) est typée « Ville » alors que c’est une réserve naturelle.

### Cause

- `type_precis = "Réserve naturelle"` ne matche pas les règles `site_naturel` dans `scripts/add-famille-type.ts` (ex. `parc naturel`, `site naturel`, mais pas `reserve naturelle`).
- Le script retombe sur `isVille(lieu)` : `population = 27566` → `pop >= 10000` → classé « ville ».
- La population 27 566 semble être celle de la commune de rattachement (Lège-Cap-Ferret ou autre), pas de l’île (~10 hab.).

### Fichiers concernés

- `scripts/add-famille-type.ts` (règles `site_naturel`, `isVille`)
- `data/cities/lieux-central.json` : Île aux Oiseaux

### Piste de correction

- Ajouter `reserve naturelle` dans les règles `site_naturel` de `add-famille-type.ts`.
- Corriger la population en base pour l’île (ou utiliser un champ `commune` pour éviter de prendre la pop de la commune).

---

## 6. Porto-Vecchio hors région (Corse)

### Constat

Porto-Vecchio apparaît alors que le profil cible Nouvelle-Aquitaine et Occitanie.

### Cause

- En base : `code_dep = "66"` (Pyrénées-Orientales, Occitanie).
- En réalité : Porto-Vecchio est en Corse (`2A`).
- Le filtre région utilise `code_dep` → Porto-Vecchio est accepté à tort.

### Fichiers concernés

- `data/cities/lieux-central.json` : Porto-Vecchio
- `lib/quiz-to-profil.ts` : `REGION_TO_DEPARTEMENTS`

### Piste de correction

Corriger `code_dep` et `departement` pour Porto-Vecchio : `2A`, `Corse-du-Sud`. Vérifier aussi la population (121 616 vs ~12 000 pour la commune).

---

## 7. Pool « villes classiques » insuffisant (complément)

### Constat

De nombreuses villes sont prises en « complément (manque de candidats) » : Saint-Gilles, Saintes, Parthenay, Limoux, Agde, etc.

### Cause (code : `lib/score-lieux.ts` l.358-428)

La sélection des classiques exige `isGoodEsthetique(l) = getScoreEsthetique(l) >= 6 || plus_beaux_villages === "oui"`.

- Beaucoup de villes n’ont pas `score_esthetique` ou ont une valeur < 6.
- Les « classiques » sont d’abord ceux avec esthétique ≥ 6 ; si le pool est trop petit, on bascule en complément.
- Le complément prend ensuite tout le reste, y compris des lieux moins adaptés.

### Piste de correction

- Enrichir `score_esthetique` pour les villes en base.
- Ou assouplir `isGoodEsthetique` pour les villes (ex. seuil à 5, ou critère alternatif).
- Analyser quelles villes n’ont pas de score pour prioriser l’enrichissement.

---

## 8. Plaine ×0,6 : bonus au lieu de malus

### Constat

Le profil indique « plaine (×0,6) » comme environnement moins souhaité, mais les lieux en plaine reçoivent un bonus.

### Cause

Dans `lib/quiz-to-profil.ts`, `CADRE_TO_TAGS` :

- `grandes_villes` → `plaine` avec `poids: 0.6`
- `campagne` → `plaine` avec `poids: 0.8`

Le scoring (`lib/score-lieux.ts` l.334-341) fait uniquement des **additions** :

```ts
score += Math.round(poids * 20);  // plaine 0.6 → +12
```

Il n’y a pas de malus pour la plaine. Un poids 0,6 est interprété comme « petit bonus » et non « pénalité ».

### Piste de correction

- Si « plaine ×0,6 » doit être un malus : autoriser des poids négatifs ou un traitement spécifique (ex. `score -= 8` pour plaine quand le profil la pénalise).
- Documenter clairement la sémantique des poids (bonus vs malus).

---

## 9. Synthèse des biais

| # | Problème | Origine | Gravité |
|---|----------|---------|---------|
| 1 | Ratio 500:1 entre familles | Base esthétique limitée à ville/village/patrimoine | Critique |
| 2 | Châteaux à 0 | Pas de base + tags hors profil | Critique |
| 3 | Lac = bord de mer | Toutes les plages reçoivent `bord_de_mer` | Majeur |
| 4 | Affichage « Autre » | Pas de cas `patrimoine` dans l’UI | Mineur |
| 5 | Île aux Oiseaux = Ville | Règles `add-famille-type` + population | Majeur |
| 6 | Porto-Vecchio en Occitanie | `code_dep` erroné en base | Majeur |
| 7 | Pool villes classiques faible | Manque de `score_esthetique` | Moyen |
| 8 | Plaine = bonus | Pas de malus, seulement bonus | Moyen |

---

## 10. Recommandations prioritaires

1. **Harmoniser l’échelle des scores** : base commune ou normalisation par famille.
2. **Donner une base aux châteaux/abbayes** : au minimum `score_esthetique × 100` si présent.
3. **Corriger les plages de lac** : ne pas attribuer `bord_de_mer` aux plages de lac.
4. **Fiabiliser la base** : Porto-Vecchio (département), Île aux Oiseaux (type, population), scores esthétiques manquants.
5. **Clarifier l’affichage** : ajouter le cas `patrimoine` et revoir les libellés « Autre ».
