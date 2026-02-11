# Fichier des péages

Les coûts des péages par segment sont définis dans **`data/peages.ts`**.

## Structure

- **Clé** : `"fromId-toId"` (identifiants des étapes, dans l’ordre du trajet).
- **Valeur** : montant en euros (nombre).

Exemple pour Paris → Bordeaux → Biarritz :

```ts
export const peagesParSegment: Record<string, number> = {
  "paris-bordeaux": 45.2,
  "bordeaux-biarritz": 18.9,
};
```

## Comment remplir

1. Ouvre **`data/peages.ts`**.
2. Pour chaque tronçon (de ville A à ville B), ajoute une entrée `"idA-idB": montant`.
3. Les ids sont ceux des étapes dans `data/mock-steps.ts` (ou plus tard dans Supabase) : `id` de chaque étape, en minuscules (ex. `paris`, `bordeaux`, `biarritz`).

Tu peux t’appuyer sur les sites des autoroutes (Bison Futé, sites des sociétés d’autoroutes, etc.) pour récupérer les montants. Si un segment n’a pas de péage, tu peux l’omettre ou mettre `0` ; l’app affichera « — » au survol.
