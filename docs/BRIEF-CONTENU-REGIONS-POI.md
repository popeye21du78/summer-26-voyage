# Brief contenu — régions carte inspiration & POI

Ce document sert à **transmettre à un assistant de rédaction** (Chat) les données factuelles et le **format de livrable** attendu pour enrichir les textes régionaux (accroches, paragraphes, « explorer la région »).

## Ce qui est branché dans l’app (technique)

- **Points orange (POI « territoires »)** : issus de `data/editorial-territories.json` — un petit nombre de **fiches territoire éditoriales** (markers, pitch), géolocalisées sur la carte en **prévisualisation région** et **exploration**. Ce ne sont pas tous les lieux du catalogue.
- **Points teal (villes / lieux du référentiel)** : issus de `data/cities/lieux-central.json`, filtrés par **départements** de la région (`lib/inspiration-map-regions-config.ts`). Clic → page **`/ville/[slug]`** ; les photos utilisent la même logique que les fiches ville (`CityPhoto` avec `stepId` = slug).
- **Si aucun point orange** : vérifier les **filtres** (ambiances / durée) dans la barre du haut — ils peuvent masquer tous les territoires de la région. Sans filtre, au moins les territoires dont `poi_sector_id` = id de la région s’affichent.

## Statistiques lieux (`lieux-central`) par région

Généré avec : `node scripts/inspiration-region-poi-stats.mjs`  
Les buckets **patrimoine / plage / rando** sont dérivés de `source_type` (même logique que `lib/inspiration-lieux-region.ts`).

| id région | Nom | Total lieux | patrimoine | plage | rando |
|-----------|-----|-------------|------------|-------|-------|
| bretagne | Bretagne | 117 | 70 | 31 | 16 |
| normandie | Normandie | 104 | 80 | 13 | 11 |
| picardie-flandre | Picardie et Flandre | 75 | 66 | 9 | 0 |
| champagne | Champagne | 63 | 53 | 3 | 7 |
| lorraine | Lorraine | 58 | 48 | 2 | 8 |
| alsace | Alsace | 40 | 31 | 1 | 8 |
| franche-comte | Franche-Comté | 79 | 55 | 5 | 19 |
| bourgogne | Bourgogne | 73 | 59 | 3 | 11 |
| ile-de-france | Île-de-France | 113 | 103 | 3 | 7 |
| val-loire-centre | Val de Loire et Centre | 90 | 85 | 2 | 3 |
| angevin-maine | Anjou et Maine | 46 | 45 | 0 | 1 |
| nantais-vendee | Pays nantais et Vendée | 46 | 29 | 14 | 3 |
| poitou-saintonge | Poitou et Saintonge | 69 | 60 | 8 | 1 |
| limousin | Limousin | 44 | 40 | 2 | 2 |
| perigord-quercy | Périgord et Quercy | 75 | 54 | 3 | 18 |
| gironde-landes | Gironde et Landes | 54 | 29 | 22 | 3 |
| pays-basque-bearn | Pays basque et Béarn | 56 | 32 | 10 | 14 |
| toulousain-gascogne | Toulousain et Gascogne | 74 | 54 | 4 | 16 |
| rouergue-cevennes | Rouergue et Cévennes | 85 | 57 | 4 | 24 |
| languedoc-roussillon | Languedoc et Roussillon | 140 | 73 | 28 | 39 |
| provence | Provence | 116 | 71 | 12 | 33 |
| cote-dazur | Côte d’Azur | 71 | 36 | 19 | 16 |
| corse | Corse | 81 | 36 | 22 | 23 |
| auvergne | Auvergne | 105 | 63 | 4 | 38 |
| savoie | Savoie et Haute-Savoie | 55 | 33 | 4 | 18 |
| dauphine-rhone | Dauphiné, Lyonnais et Forez | 102 | 77 | 6 | 19 |

## Départements par région (référence unique)

Source de vérité : `lib/inspiration-map-regions-config.ts` (`MAP_REGIONS`).

Pour chaque ligne : **`id`** | **nom affiché** | **codes département** (tels qu’en base).

- **bretagne** — Bretagne — 22, 29, 35, 56  
- **normandie** — Normandie — 14, 27, 50, 61, 76  
- **picardie-flandre** — Picardie et Flandre — 02, 59, 60, 62, 80  
- **champagne** — Champagne — 08, 10, 51, 52  
- **lorraine** — Lorraine — 54, 55, 57, 88  
- **alsace** — Alsace — 67, 68  
- **franche-comte** — Franche-Comté — 25, 39, 70, 90  
- **bourgogne** — Bourgogne — 21, 58, 71, 89  
- **ile-de-france** — Île-de-France — 75, 77, 78, 91, 92, 93, 94, 95  
- **val-loire-centre** — Val de Loire et Centre — 18, 28, 36, 37, 41, 45  
- **angevin-maine** — Anjou et Maine — 49, 53, 72  
- **nantais-vendee** — Pays nantais et Vendée — 44, 85  
- **poitou-saintonge** — Poitou et Saintonge — 16, 17, 79, 86  
- **limousin** — Limousin — 19, 23, 87  
- **perigord-quercy** — Périgord et Quercy — 24, 46, 47  
- **gironde-landes** — Gironde et Landes — 33, 40  
- **pays-basque-bearn** — Pays basque et Béarn — 64, 65  
- **toulousain-gascogne** — Toulousain et Gascogne — 09, 31, 32, 82  
- **rouergue-cevennes** — Rouergue et Cévennes — 07, 12, 48  
- **languedoc-roussillon** — Languedoc et Roussillon — 11, 30, 34, 66, 81  
- **provence** — Provence — 04, 05, 13, 84  
- **cote-dazur** — Côte d’Azur — 06, 83  
- **corse** — Corse — 2A, 2B  
- **auvergne** — Auvergne — 03, 15, 43, 63  
- **savoie** — Savoie et Haute-Savoie — 73, 74  
- **dauphine-rhone** — Dauphiné, Lyonnais et Forez — 01, 26, 38, 42, 69  

## Format demandé au rédacteur (JSON)

À produire **une entrée par `regionId`** (voir `content/inspiration/regions.ts` pour les ids réellement utilisés côté UI).

```json
{
  "regions": [
    {
      "id": "bretagne",
      "accroche_carte": "1 phrase percutante sous le titre",
      "paragraphe_explorer": "120–220 caractères, ton magazine voyage",
      "trois_incontournables": ["lieu ou ville 1", "lieu ou ville 2", "lieu ou ville 3"],
      "note_terrain": "optionnel : contraste mer / intérieur, saisons, etc."
    }
  ]
}
```

**Contraintes** : ne pas inventer de faits chiffrés non présents dans les stats ci-dessus ; les **incontournables** peuvent être des noms présents dans le référentiel (villes / lieux) ou des territoires éditoriaux listés pour la région.

## Territoires éditoriaux (aperçu)

Le fichier `data/editorial-territories.json` contient **8** territoires ; chacun a un `poi_sector_id` qui rattache la fiche à une **région carte**. Pour les « principaux POI » côté narration, croiser : territoires + top lieux par `score_esthetique` / notoriété dans `lieux-central` pour les départements concernés.
