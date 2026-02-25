# Dossiers photos

Arborescence pour ranger tes photos par **type** → **département** → **site**.

- **Type (grande famille)** : abbaye, chateau, autre, patrimoine, plage, rando, site_naturel, village, ville, musee
- **Département** : ex. Bouches-du-Rhône, Hérault, Ain…
- **Site** : un dossier par lieu (slug issu des données Excel / `lieux-central.json`)

Tu peux déposer tes photos dans le dossier du site correspondant. Les dossiers ont été générés à partir de `data/cities/lieux-central.json` (données exportées depuis l’Excel `lieux-central.xlsx`).

Pour régénérer l’arborescence après mise à jour des données :

```bash
node scripts/create-photos-folders.mjs
```

(ou `npx tsx scripts/create-photos-folders.ts` si tu préfères la version TypeScript)
