# Données départementales (Passe 1 + profils)

## classement.json

Tier d'attractivité **patrimoniale** de chaque département (S, A, B, C, D). Généré par :

```bash
npx tsx scripts/classify-departements.ts
```

Structure : `classement` = tableau de `{ code, departement, tier }`.

## profils-cotiers.json

Profil **côtier** par département (littoral, type de côte, nb plages, surf, criques, lacs). Rempli manuellement à partir du prompt Gemini (voir `docs/prompt-gemini-profils-cotiers.md`). Le script Passe 2 lit uniquement la ligne du département demandé.

## profils-randos.json

Profil **rando** par département (tier rando, type, nb_randos, D+ typique). Rempli manuellement à partir du prompt Gemini (voir `docs/prompt-gemini-profils-randos.md`). Départements en tier D → 0 rando demandée.

## Réutilisation (Passe 2)

Pour chaque département à générer, le script :

1. Lit `classement.json` → tier patrimoine, nom
2. Lit `profils-cotiers.json` → nb_plages (ou 0), contexte plages
3. Lit `profils-randos.json` → nb_randos (ou 0), contexte randos
4. Remplit le prompt à trous avec ces seules données (pas les 95 autres départements)
