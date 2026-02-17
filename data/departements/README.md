# Classement des départements (Passe 1)

Le fichier **classement.json** contient le tier d'attractivité patrimoniale de chaque département métropolitain (S, A, B, C, D). Il est généré par :

```bash
npx tsx scripts/classify-departements.ts
```

## Structure

- **generatedAt** : date de génération
- **usage** : tokens consommés (OpenAI)
- **classement** : tableau de `{ code, departement, tier }`

## Réutilisation pour la Passe 2

Lors de la génération par département (Passe 2), le script doit :

1. Lire `data/departements/classement.json`
2. Pour chaque département à générer, récupérer son **tier**
3. Appliquer la table des effectifs selon le tier (ex. S → 45–50 patrimoine, A → 30–40, etc.)
4. Injecter dans le prompt : `TIER`, `NB_PATRIMOINE`, `NB_PEPITES`, `NB_PLAGES`, `NB_RANDOS`

Ainsi on ne refait jamais la classification : on la charge une fois et on l’utilise pour tous les appels Passe 2.
