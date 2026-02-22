# Prompt Gemini — Profils randonnée des 96 départements métropolitains

Coller ce prompt tel quel dans Gemini Pro. Copier le JSON de sortie dans `data/departements/profils-randos.json`.

---

Tu es un randonneur expert ayant parcouru toute la France. Classe les 96 départements métropolitains selon leur potentiel de randonnée en boucle (retour au point de départ), sur une ÉCHELLE NATIONALE ABSOLUE.

## CONTEXTE

Ce classement alimente un algorithme de voyage en van. L'objectif est de proposer UNIQUEMENT des randonnées qui valent le détour à l'échelle nationale. On ne veut PAS un "top 10" relatif par département : si le meilleur circuit du département est médiocre comparé à ce qu'on trouve ailleurs en France, on préfère 0 rando plutôt que 10 randos tièdes. L'utilisateur voyage dans TOUTE la France : il ira randonner là où c'est exceptionnel, pas partout.

## CRITÈRES DE CLASSEMENT

Évalue chaque département selon :
1. **Qualité des paysages traversés** : panoramas, diversité, émerveillement
2. **Densité de sentiers balisés en boucle** : PR, GR de pays, circuits FFRandonnée
3. **Dénivelé et relief** : capacité à offrir des randonnées variées (facile à difficile)
4. **Réputation nationale** : le département est-il une DESTINATION rando reconnue ?
5. **Diversité des ambiances** : gorges, crêtes, forêts, lacs, rivières, littoral...

## CHAMPS À REMPLIR

- "code" : code département
- "departement" : nom officiel
- "tier_rando" : exactement un parmi "S", "A", "B", "C", "D"
- "type_rando" : 1 à 2 éléments parmi : "alpin" (haute montagne, sentiers d'altitude, > 1500m), "montagne_moyenne" (600-1500m, crêtes accessibles), "gorges_canyon" (gorges, falaises, rivières encaissées), "littoral" (sentiers côtiers, GR34/GR51 type), "foret_vallon" (vallons boisés, rivières, bocage vallonné), "volcanique" (reliefs volcaniques, puys, plateaux), "plaine" (plat, sans relief significatif)
- "nb_randos" : nombre de randonnées en boucle à lister pour ce département
- "denivele_typique" : fourchette de D+ typique en mètres pour les boucles du département, ex: "300-800"
- "justification" : 1 phrase expliquant le classement

## CALIBRATION DES TIERS

### Tier S — Destination rando LÉGENDAIRE (top 10 national)
Département où l'on VIENT EXPRÈS pour randonner. Sentiers mondialement connus. Paysages à couper le souffle sur la majorité des circuits. nb_randos = 12.

Exemples indicatifs : Haute-Savoie (Mont-Blanc, Aravis), Hautes-Pyrénées (cirques, Néouvielle), Corse-du-Sud (GR20, aiguilles de Bavella), Haute-Corse (GR20, Restonica), Savoie (Vanoise, Beaufortain), Hautes-Alpes (Écrins, Queyras), Pyrénées-Atlantiques (Pays Basque + Béarn), Pyrénées-Orientales (Canigou, Carlit), Ariège (haute chaîne pyrénéenne).

### Tier A — Destination rando EXCELLENTE
Relief marqué, paysages remarquables, bons sentiers. On peut y passer plusieurs jours de rando sans se lasser. nb_randos = 10.

Exemples : Ardèche (gorges), Aveyron (Aubrac, gorges du Tarn), Lot (causses, vallées), Alpes-de-Haute-Provence (Verdon, Luberon), Cantal (volcans, Jordanne), Isère (Chartreuse, Vercors), Drôme (Baronnies, Vercors sud), Var (Maures, Sainte-Baume, calanques), Puy-de-Dôme (chaîne des Puys, Sancy).

### Tier B — BONNE randonnée, pas une destination en soi
Quelques beaux circuits, relief suffisant, mais on n'y vient pas exprès pour la rando. nb_randos = 6-8.

Exemples : Dordogne (vallées, plateaux), Gard (Cévennes sud, garrigues), Hérault (Caroux, cirques), Jura, Vosges, Alpes-Maritimes (arrière-pays), Bouches-du-Rhône (calanques, Sainte-Victoire).

### Tier C — Randonnée ANECDOTIQUE
Relief faible ou paysages peu variés. Quelques balades sympathiques mais rien de mémorable à l'échelle nationale. nb_randos = 3-5.

Exemples : Charente, Dordogne plate (nord), Loir-et-Cher, Indre, Corrèze (parties basses).

### Tier D — PAS DE RANDO SIGNIFICATIVE
Département plat, urbain, ou sans circuit balisé digne d'intérêt. Ne pas forcer. nb_randos = 0.

Exemples : Nord, Pas-de-Calais, Seine-Saint-Denis, Hauts-de-Seine, Val-de-Marne, Yvelines (trop urbain/plat), Aisne, Somme (plat), Eure-et-Loir (Beauce).

## RÈGLES IMPORTANTES

1. **Sois EXIGEANT**. La France est un pays exceptionnel pour la rando. Si un département n'apporte rien qu'on ne trouve pas en mieux ailleurs, il est tier C ou D. Ne mets en S que les 8-10 départements VRAIMENT légendaires.

2. **NE CONFONDS PAS tourisme et rando**. La Gironde est un super département touristique, mais pour la RANDO en boucle dans des paysages grandioses, c'est tier C maximum.

3. **Départements franciliens** : évalue le potentiel RANDO, pas les parcs urbains. Fontainebleau (77) est un cas particulier (rando/escalade connue), mais la plupart = tier D.

4. **Un département peut être tier A en patrimoine et tier D en rando** (ex: Paris, Bouches-du-Rhône hors calanques). Les deux classements sont INDÉPENDANTS.

## FORMAT DE SORTIE

Réponds UNIQUEMENT par un JSON valide, sans texte ni commentaire.

```json
{
  "generated": "2026-02-18",
  "description": "Profils randonnée des 96 départements métropolitains",
  "departements": [
    {
      "code": "01",
      "departement": "Ain",
      "tier_rando": "B",
      "type_rando": ["montagne_moyenne"],
      "nb_randos": 6,
      "denivele_typique": "400-900",
      "justification": "Bugey et Jura méridional offrent de belles boucles avec vues sur les Alpes, mais pas une destination rando en soi."
    },
    {
      "code": "74",
      "departement": "Haute-Savoie",
      "tier_rando": "S",
      "type_rando": ["alpin"],
      "nb_randos": 12,
      "denivele_typique": "800-1500",
      "justification": "Mont-Blanc, Aravis, Chablais, Bornes : densité exceptionnelle de circuits alpins avec lacs, glaciers et panoramas de classe mondiale."
    }
  ]
}
```

Classe les 96 départements métropolitains : codes 01 à 19, 21 à 95, 2A, 2B. Ordre : par code croissant.
