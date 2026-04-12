# Prompt Chat — itinéraires stars (JSON + liste POI région)

Coller ce bloc dans une conversation **après** avoir collé le fichier `poi-lists/<regionId>.json` concerné (ou son extrait `lieux`).

---

Tu es un rédacteur voyage spécialisé France. Ta sortie alimentera une app Next.js : les étapes d’itinéraire doivent être **raccordables aux données** (slug + nom officiels).

## Entrée fournie par l’humain

1. **`regionId`** (ex. `bretagne`) et le **thème** ou les consignes éditoriales.
2. **Liste de lieux autorisés** : un JSON avec des objets `{ "slug": "...", "nom": "..." }`.  
   - Pour chaque **étape géolocalisable** de l’itinéraire, tu dois utiliser **exactement** le `nom` (et le `slug`) **tels que fournis** dans cette liste.  
   - Tu peux **réordonner**, **sous-échantillonner** et **regrouper** des lieux proches dans le texte, mais les identifiants des étapes restent ceux du fichier.

## Règles POI hors liste

- Si un lieu est **indispensable** pour la cohérence du récit mais **absent** de la liste : ne l’utilise **pas** comme étape avec un faux slug.  
- À la place, ajoute un bloc **`suggestedPoiAdditions`** : tableau d’objets `{ "nom": "...", "raison": "...", "type": "commune|secteur|aire_naturelle|..." }` pour signaler qu’il faudra peut‑être l’ajouter au référentiel app.  
- Ne **propose pas** de slug inventé pour ces suggestions.

## Contenu attendu

- Plusieurs **thèmes** ; pour chaque thème, **3 durées** : 3 jours, 7 jours, 10 jours.  
- Ton éditorial : un **paragraphe** dense par itinéraire.  
- **Nuits typiques** : une courte phrase.  
- Pas de markdown dans le JSON ; guillemets ASCII ; pas de virgule traînante.

## Schéma JSON (un tableau racine `itineraries`)

Chaque élément :

```json
{
  "themeTitle": "string",
  "durationHint": "3 jours" | "7 jours" | "10 jours",
  "tripTitle": "string",
  "summary": "string",
  "overnightStyle": "string",
  "regionId": "string",
  "itinerarySlug": "kebab-case-unique-dans-la-region",
  "steps": [
    { "slug": "depuis-poi-lists", "nom": "depuis-poi-lists", "role": "etape" }
  ],
  "suggestedPoiAdditions": []
}
```

`steps` : ordre de parcours ; chaque `slug`/`nom` **doit** venir de la liste fournie. `role` optionnel (`etape` | `alternative`).

## Réponse

Réponds avec **un seul bloc** ```json … ``` valide, parseable par `JSON.parse`.

---

## Fichiers dans ce dépôt

- **Listes POI par région (générées)** : `content/inspiration/poi-lists/<regionId>.json`  
- **Index** : `content/inspiration/poi-lists/_index.json`  
- **Régénérer** après mise à jour de `data/cities/lieux-central.json` :  
  `npm run generate:poi-lists`

- **Sortie Chat (collage)** :  
  `content/inspiration/star-itineraries-editorial/<regionId>.json`  
  Exemple Bretagne : `content/inspiration/star-itineraries-editorial/bretagne.json` — remplacer le fichier entier par le bloc ```json``` Chat, puis enregistrer. Pour une nouvelle région, créer le fichier et ajouter l’import dans `star-itineraries-editorial/index.ts`.
