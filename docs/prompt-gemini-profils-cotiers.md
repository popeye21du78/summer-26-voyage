# Prompt Gemini — Profils côtiers des 96 départements métropolitains

Coller ce prompt tel quel dans Gemini Pro. Copier le JSON de sortie dans `data/departements/profils-cotiers.json`.

---

Tu es un géographe spécialiste du littoral français. Classe les 96 départements métropolitains selon leur profil côtier et balnéaire.

## RÈGLES

1. Un département est "côtier" s'il possède un littoral maritime (mer ou océan). Les lacs intérieurs NE RENDENT PAS un département côtier, mais peuvent justifier quelques "plages de lac" (champ séparé).

2. Le classement est NATIONAL et ABSOLU : le nombre de plages à lister reflète la qualité et la diversité du littoral comparé à TOUTE la France, pas au département voisin.

3. Sois FACTUEL : la façade maritime, le type de côte, la présence de surf ou de criques sont des réalités géographiques, pas des opinions.

## CHAMPS À REMPLIR POUR CHAQUE DÉPARTEMENT

- "code" : code département (string, "01" à "95", "2A", "2B")
- "departement" : nom officiel
- "cotier" : true/false — possède un littoral maritime
- "facade" : null si pas côtier, sinon exactement un parmi : "atlantique", "manche", "mediterranee" (la Corse = "mediterranee")
- "type_cote" : null si pas côtier, sinon 1 à 3 éléments parmi : "sable_long" (grandes plages de sable), "dune" (cordons dunaires), "falaise" (côte à falaises), "rocher_decoupe" (côte rocheuse découpée, criques), "calanque", "marais_vasiere" (zones humides littorales, pas de plage), "estuaire"
- "surf" : true/false — spots de surf reconnus nationalement (pas du bodyboard en été, du VRAI surf avec communauté locale)
- "criques" : true/false — présence de criques ou petites plages intimes naturellement enclavées
- "nb_plages" : nombre de plages remarquables à lister pour ce département (0 si pas côtier ou littoral sans plage notable, max 12 pour les meilleurs)
- "lacs_baignables" : true/false — le département possède-t-il au moins un lac avec plage(s) aménagée(s) significative(s) (Léman, Annecy, Bourget, Serre-Ponçon, Sainte-Croix, lacs landais...)
- "nb_plages_lac" : nombre de plages de lac à lister (0 à 5, seulement si lacs_baignables = true et que ça vaut le détour à l'échelle nationale)

## CALIBRATION nb_plages

- 10-12 : littoral exceptionnel, diversité de plages, destination balnéaire majeure (ex: Var, Corse-du-Sud, Hérault, Finistère, Landes)
- 7-9 : très bon littoral avec plusieurs plages remarquables (ex: Gironde, Charente-Maritime, Bouches-du-Rhône, Morbihan)
- 4-6 : littoral correct, quelques bonnes plages (ex: Calvados, Vendée côte limitée)
- 1-3 : littoral limité ou majoritairement sans plage (ex: Seine-Maritime = falaises, Nord = peu de plages notables)
- 0 : pas côtier OU côtier mais sans plage remarquable (ex: estuaire industriel)

## FORMAT DE SORTIE

Réponds UNIQUEMENT par un JSON valide, sans texte ni commentaire avant ou après.

```json
{
  "generated": "2026-02-18",
  "description": "Profils côtiers des 96 départements métropolitains",
  "departements": [
    {
      "code": "01",
      "departement": "Ain",
      "cotier": false,
      "facade": null,
      "type_cote": null,
      "surf": false,
      "criques": false,
      "nb_plages": 0,
      "lacs_baignables": false,
      "nb_plages_lac": 0
    },
    {
      "code": "06",
      "departement": "Alpes-Maritimes",
      "cotier": true,
      "facade": "mediterranee",
      "type_cote": ["rocher_decoupe", "sable_long"],
      "surf": false,
      "criques": true,
      "nb_plages": 8,
      "lacs_baignables": false,
      "nb_plages_lac": 0
    }
  ]
}
```

Classe les 96 départements métropolitains : codes 01 à 19, 21 à 95, 2A, 2B. Ordre : par code croissant.
