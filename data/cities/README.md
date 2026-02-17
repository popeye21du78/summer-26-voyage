# Données lieux (carte et moteur)

## Source actuelle : lieux-central.xlsx

**Un seul fichier** : `data/cities/lieux-central.xlsx`

- **4 onglets** : Patrimoine, Pépites, Plages, Randos.
- **Tous départements** dans le même fichier (colonnes `code_dep`, `departement` pour filtrer).
- La page **Carte lieux** lit ce fichier et affiche les points ayant `lat` et `lng` renseignés. Un filtre par département est disponible.

Pour régénérer le fichier vide (en-têtes uniquement) :

```bash
npx tsx scripts/create-lieux-central-xlsx.ts
```

## Anciens fichiers (non utilisés par la carte)

- **data-villes.xlsx** : ancienne source, remplacée par `lieux-central.xlsx`. Tu peux le supprimer ou le garder en archive.
- **cities-maitre.csv** : copie de l’ancien workflow ; plus utilisé par l’app.

## Enrichissement (lat, lng, population, description)

```bash
npx tsx scripts/enrich-lieux-central.ts
```

- **Mapbox** : géocodage (nom + département ou commune) → `lat`, `lng` (et `lat_depart`/`lng_depart` pour les randos).
- **INSEE** (geo.api.gouv.fr) : à partir des coords → `population` (onglets Patrimoine, Pépites).
- **Wikipedia** : extrait FR → `description_courte` si vide (Patrimoine, Pépites).

Cache : `data/cities/geocode-cache-lieux.json` (évite de rappeler Mapbox pour les mêmes lieux).
