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

## Génération des données (patrimoine, plages, randos)

→ Voir **`docs/RECAP-DECISIONS-DATA-BATCH.md`** pour le plan batch Phase 1 et les décisions associées.

Script actuel (sync, 1 département à la fois) :

```bash
npx tsx scripts/generate-departement.ts 24   # ex. Dordogne
```

## Enrichissement (lat, lng, population, description)

```bash
npx tsx scripts/enrich-lieux-central.ts
```

- **Mapbox** : géocodage (nom + département ou commune) → `lat`, `lng` (et `lat_depart`/`lng_depart` pour les randos).
- **INSEE** (geo.api.gouv.fr) : à partir des coords → `population` (onglets Patrimoine, Pépites).
- **Wikipedia** : extrait FR → `description_courte` si vide (Patrimoine, Pépites).

Cache : `data/cities/geocode-cache-lieux.json` (évite de rappeler Mapbox pour les mêmes lieux).

## Colonne famille_type

Regroupe les lieux en familles : **ville**, **village**, **musee**, **rando**, **chateau**, **abbaye**, **site_naturel**, **patrimoine**, **plage**, **autre** (quartiers, parcs thématiques uniquement).

**Workflow complet** (après modification de l'Excel) :
```bash
npx tsx scripts/export-lieux-central-to-csv.ts --json   # Excel → JSON
npx tsx scripts/add-famille-type.ts                     # calcule famille_type dans le JSON
npx tsx scripts/add-famille-type-to-excel.ts            # reporte famille_type dans l'Excel
```

Pour le JSON uniquement :
```bash
npx tsx scripts/add-famille-type.ts
```

## Export CSV

Pour générer des fichiers CSV à partir de l’Excel (upload agent, parsers, etc.) :

```bash
npx tsx scripts/export-lieux-central-to-csv.ts
```

Génère dans `data/cities/` :
- **patrimoine.csv**, **plages.csv**, **randos.csv** — un fichier par onglet
- **lieux-central.csv** — CSV unifié avec colonne `source_type` (patrimoine | plage | rando), lat/lng normalisés
- **lieux-central.json** — JSON unifié `{ lieux: [...] }` pour assistants/agents (format supporté par la plupart des plateformes)

Options : `--unified` (CSV unifié + JSON), `--sheets` (uniquement les 3 CSV par onglet), `--json` (uniquement lieux-central.json).
