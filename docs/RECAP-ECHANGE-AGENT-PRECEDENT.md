# Récap échange — Ce qu'on s'est dit pour le code (changement d'agent)

**Date** : 19 février 2026  
**Objectif** : Passer le relais à un nouvel agent avec tout le contexte technique et les décisions prises.

---

## 1. Problèmes corrigés (fait)

### Build error — Import QuizPreVoyage
- **Fichier** : `app/(main)/voyage/nouveau/page.tsx`
- **Erreur** : `Module not found: Can't resolve '../../../components/QuizPreVoyage'`
- **Cause** : Chemin relatif incorrect (3 niveaux au lieu de 4 pour atteindre la racine)
- **Correction** : 
  ```tsx
  // Avant : ../../../
  // Après : ../../../../ 
  import QuizPreVoyage from "../../../../components/QuizPreVoyage";
  import type { QuizPreVoyageAnswers } from "../../../../data/quiz-types";
  ```

### Build error — Syntaxe QuizPreVoyage
- **Fichier** : `components/QuizPreVoyage.tsx`
- **Erreur** : `Expected '</', got ')'` à la ligne 236
- **Cause** : Le callback du `.map()` utilisait un bloc `{ return (...); })` — le parser JSX se trompait sur la fermeture `)}`
- **Correction** : Passer à une forme expression `(key) => (...)` au lieu de `(key) => { return (...); }`, et extraire `hebergementLabels` hors du `return`

### Push GitHub
- Commit `1ffa236` poussé sur `https://github.com/popeye21du78/summer-26-voyage.git`
- 105 fichiers modifiés/ajoutés

---

## 2. Tags et `type_precis` — Décisions pour le coding

### Problème identifié
- **`type_precis`** : ~387 valeurs différentes dans `lieux-central.json` (ex. "Cité médiévale", "Village de charme", "Ville historique", etc.)
- **Effet** : Filtrage trop strict — peu de villes matchent un type exact → très peu de résultats compatibles avec une demande type "Cité médiévale"
- **Conclusion** : Le type précis en entrée est le **frein principal** pour la pertinence des propositions.

### Décisions prises
1. **Assouplir le filtrage** : ne pas exiger une correspondance exacte sur `type_precis`.
2. **Privilégier les tags** : utiliser `tags_architecture` et `tags_cadre` pour la pertinence thématique.
3. **Élargir en entrée** : si l'utilisateur choisit un type précis, le mapper vers une **famille de types** (ex. "Cité médiévale" → inclure "Ville médiévale", "Village médiéval", "Cité médiévale fortifiée", etc.).
4. **À implémenter** dans le code de matching / sélection des lieux.

---

## 3. Workflow agent 6 nœuds (itinéraires)

Architecture prévue pour générer des itinéraires "star" :

1. **AnalyseDemande** → extrait la demande utilisateur
2. **MappingFiltres** → mappe vers filtres exploitables (région, thèmes, etc.)
3. **ExtractionLieux** → retourne `lieux_candidats` (pas les filtres !)
4. **SelectionZones** → choix géographique cohérent (éviter Aude + Seine-et-Marne à 700 km)
5. **ConstructionTour** → ordonnancement des étapes
6. **GenerationFinale** → texte final

### Problèmes constatés (passés)
- MappingFiltres : JSON invalide sur `plus_beaux_villages`, `unesco`, `site_classe` → corrigé dans le prompt
- ExtractionLieux : renvoyait les filtres au lieu de `lieux_candidats` → corrigé
- SelectionZones : choix géographique incohérent (zones trop éloignées)
- Hallucinations (lieux absents des données, ex. Lagrasse)
- Thème "oubliées" non respecté (Carcassonne, Provins trop connus)

---

## 4. Prochaine étape : Itinéraires prédéfinis

**Décision** : Passer à l’implémentation côté code avec des **itinéraires tout faits**.

- **~20 itinéraires** à produire via ChatGPT (spécialisé dans ce type de contenu).
- Ces itinéraires serviront de base pour le parcours "Découvrir des voyages" (Étape 3a de PROJET-VISION-COMPLETE.md).
- Exemples possibles : "La route des cathédrales", "Le Lot en 5 jours", "Les plus beaux villages du Sud", etc.

---

## 5. Fichiers et données importants

| Rôle | Fichier(s) |
|------|------------|
| Lieux central | `data/cities/lieux-central.json`, `lieux-central.xlsx` |
| Quiz pré-voyage | `components/QuizPreVoyage.tsx`, `data/quiz-types.ts` |
| Quiz identité | `components/QuizIdentite.tsx` |
| Page nouveau voyage | `app/(main)/voyage/nouveau/page.tsx` |
| Tags / types lieux | `lib/lieux-types.ts`, `scripts/prompt-passe2.ts` |
| Export lieux | `scripts/export-lieux-central-to-csv.ts` |
| Vision projet | `docs/PROJET-VISION-COMPLETE.md` |
| Récap global | `docs/RECAP-PROJET.md` |

---

## 6. Indications pour le nouvel agent

1. **Données** : `type_precis` (~387 valeurs) — à assouplir via tags et familles de types.
2. **Coding** : Implémenter le matching élargi (tags + familles) dans la sélection des lieux.
3. **Itinéraires** : Prévoir ~20 itinéraires prédéfinis (sources ChatGPT) pour "Découvrir des voyages".
4. **Build** : Les corrections QuizPreVoyage sont en place ; le build devrait passer.
