# Enseignements — quiz pré-voyage & itinéraires automatiques

Ce fichier résume ce qu’on avait construit (jusqu’à mars 2026) avant de retirer le code pour repartir plus léger. Utile quand on recréera le flux.

## Ce qui fonctionnait plutôt bien

- **Quiz → profil structuré** : les réponses (identité + pré-voyage) passaient par `quizToProfilRecherche` pour produire un `ProfilRecherche` (tags cadre, familles de lieux, proportions ambiance via mixeur 0–3, régions, pépites %, rythme). Ce modèle reste la base logique du **scoring** dans `lib/score-lieux.ts` et `POST /api/score-lieux`.
- **Mixeur d’ambiance** : normalisation des niveaux en pourcentages sommant à 100 % (`computeProportionsFromMixeur`, `inferMixLevelsFromProportions`) — encore disponibles dans `lib/quiz-to-profil.ts` (types + helpers uniquement).
- **Carte des lieux scorés** : après le quiz, affichage Mapbox des lieux filtrés (top %) avec lien vers fiches ville — bon retour UX quand le token Mapbox est configuré.
- **Génération d’itinéraire multi-jours** : pipeline lourd mais cohérent — corridor entre départ/arrivée, sélection de lieux, clusters, TSP / greedy, nuits van vs étapes, tracé « spine » sur la carte. Vivait sous `lib/itinerary/*` et `POST /api/itinerary` (modes `from/to/nights` et `lieux + start/end`).
- **Itinéraire éditable sur voyage prévu** : `VoyageItineraireEditor` + `itineraire-helpers` + overrides `localStorage` (`voyage-local-overrides`) permettaient d’ajuster ordre, types de nuitée, dates — utile pour itérer sans repasser par le générateur.
- **Itérations avec Claude** : le questionnaire V2 (photos plein écran, roulette de jours, branches conditionnelles) et le texte « compte rendu » du profil donnaient une **sensation produit** forte, même si la complexité nuisait aux perfs IDE et au build.

## Ce qui posait problème

- **Taille et couplage** : `app/(main)/voyage/nouveau/page.tsx` (~1700 lignes) mélangeait quiz, session storage, scoring, carte, appels Directions Mapbox, génération d’itinéraire — difficile à maintenir et à faire évoluer.
- **Conflits Next / verrous** : plusieurs instances `next dev` + fichier `.next/dev/lock` → erreurs opaques pour les devs.
- **Workspace OneDrive** : beaucoup de fichiers surveillés = lenteur perçue dans Cursor (indépendamment de la qualité du code).
- **API planning** : l’UI Planning attendait un GET/POST sur les **lignes Supabase** ; l’ancien `POST /api/itinerary` ne gérait que la génération algorithmique — la sauvegarde « steps » était fragile. Désormais : **`GET/POST /api/trip-planning`** aligné sur `getItinerary` / `upsertItinerary`.

## Fichiers supprimés (référence si besoin de git)

- Composants : `QuizPreVoyage.tsx`, `QuizPreVoyageV2.tsx`, `components/quiz/DayRoulette.tsx`, `VoyageItineraireEditor.tsx`, `AmbianceBlock.tsx`
- Lib : tout le dossier `lib/itinerary/`, `quiz-to-profil-ville.ts`, `ambiance-proportions.ts`, `itineraire-helpers.ts`
- API : `app/api/itinerary/route.ts`
- Script : `scripts/test-itinerary.ts`

## Ce qu’on garde pour la suite

- **Profil voyageur** : page `/profil` + `QuizIdentite` + `data/quiz-types.ts` (identité).
- **Scoring** : `ProfilRecherche` + `score-lieux` + `/api/score-lieux` (à rappeler depuis un futur mini-formulaire si besoin).
- **Étapes voyage (Supabase)** : `lib/itinerary-supabase.ts`, `/api/steps`, **`/api/trip-planning`** pour Planning / Data.
- **Reconstruction recommandée** : petits écrans ; un seul état global ou URL ; éviter un second « mega fichier » ; idéalement repo hors OneDrive ou exclusions `node_modules` / `.next`.
