# Itinéraires stars (contenu Chat → JSON)

- **26 fichiers** (un par région carte) : `content/inspiration/star-itineraries-editorial/<regionId>.json` — tous préremplis avec `{ "itineraries": [] }` pour collage Chat.
- **Imports** : déjà regroupés dans `index.ts`.
- **Action** : remplacer **tout** le contenu du fichier par la sortie Chat (objet racine `{ "itineraries": [ ... ] }`), UTF-8, puis sauvegarder.
- **Référentiel POI** (slugs autorisés) : `content/inspiration/poi-lists/<regionId>.json`.
- **Types** : `types/star-itineraries-editorial.ts` — export groupé : `content/inspiration/star-itineraries-editorial/index.ts`.

L’UI utilise `starItinerariesEditorialForRegion` + `/api/inspiration/region-star-lines` pour les tracés.

**POI suggérés (hors référentiel)** : `npm run collect:suggested-poi` → `content/inspiration/POI-SUGGERES-AJOUT.md`.
