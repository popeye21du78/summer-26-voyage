# Ton itinéraire – où mettre tes données

**Dossier racine** : `content/itineraire/`

C’est ici que tu peux déposer les fichiers de ton itinéraire réel : dates, péages, infos étapes.

---

## 1. Étapes et dates

**Fichier** : `content/itineraire/etapes.json`

Tu peux remplacer ce fichier par ton propre itinéraire. Format attendu :

```json
[
  {
    "id": "paris",
    "nom": "Paris",
    "coordonnees": { "lat": 48.8566, "lng": 2.3522 },
    "date_prevue": "2026-06-15",
    "description_culture": "Capitale, musées, quais de Seine…",
    "budget_prevu": 180,
    "contenu_voyage": {
      "photos": ["/voyage/photos/paris/1.jpg", "/voyage/photos/paris/2.jpg"],
      "anecdote": "Premier soir au parc…",
      "depenses_reelles": 165
    }
  }
]
```

- `id` : identifiant unique (slug), ex. `paris`, `bordeaux`, `prefailles`
- `coordonnees` : latitude et longitude (pour la carte)
- `date_prevue` : format `YYYY-MM-DD`
- `photos` : chemins vers tes images (voir section Photos ci‑dessous)

---

## 2. Péages

**Fichier** : `content/itineraire/peages.json`

Tu peux remplacer ce fichier par tes montants réels. Format attendu :

```json
{
  "paris-bordeaux": 45.2,
  "bordeaux-biarritz": 18.9
}
```

Clé = `"idEtape1-idEtape2"` (dans l’ordre du trajet).

---

## 3. Photos

**Dossier** : `public/voyage/photos/`

Les photos doivent être dans `public/` pour être accessibles sur le site.

Structure recommandée :

```
public/voyage/photos/
├── paris/
│   ├── 1.jpg
│   ├── 2.jpg
│   └── couverture.jpg
├── bordeaux/
│   └── 1.jpg
└── prefailles/
    └── plage.jpg
```

Dans `etapes.json`, utilise des chemins commençant par `/voyage/photos/` :

```json
"photos": ["/voyage/photos/paris/1.jpg", "/voyage/photos/paris/2.jpg"]
```

---

## Activer ton itinéraire

Pour l’instant, l’app utilise encore les données mock (`data/mock-steps.ts`, `data/peages.ts`).

Pour utiliser ton itinéraire :

- remplace le contenu de `data/mock-steps.ts` en t’inspirant de ton `content/itineraire/etapes.json`, **ou**
- indique à l’assistant : « charge les étapes depuis `content/itineraire/etapes.json` » pour qu’il branche le loader.

Même principe pour les péages : édition de `data/peages.ts` ou branchement sur `content/itineraire/peages.json`.
