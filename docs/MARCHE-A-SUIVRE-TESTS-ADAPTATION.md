# Marche à suivre : tester l'adaptation multi-profils sur une sortie API

Les textes adaptés sont générés dans **`data/test-adaptation/output/`** (fichiers `.md` + un `.doc` pour Word). Ils ne sont pas affichés sur le site.

---

## 1. Les 5 profils de test

| Profil | Personne | Contexte | Paramètres clés |
|--------|----------|----------|-----------------|
| **Marc** | Homme, seul | Seul | genre=homme, typePartenaire=seul, tutoiement=oui |
| **Annie** | Femme, seule | Seule | genre=femme, typePartenaire=seul, tutoiement=oui |
| **André** | Homme, avec Léo et Jean | Amis | genre=homme, typePartenaire=amis, pluriel=oui, amis=[Léo,Jean] |
| **Adeline** | Femme, avec copain Joris | Couple | genre=femme, typePartenaire=couple, partenaire=Joris(homme) |
| **Sophie** | Femme, famille Paul + Léa et Tom | Famille, vous | genre=femme, typePartenaire=famille, tutoiement=non, partenaire=Paul, enfants=[Léa,Tom] |

---

## 2. Entrée

Placer la sortie brute de l'API (avec délimiteurs `---PRESENTATION---`, `---HISTOIRE_BASES---`, etc.) dans un fichier `.txt` :

```
data/test-adaptation/<ville>-raw.txt
```

Exemple : `data/test-adaptation/colmar-raw.txt`.

---

## 3. Générer les textes adaptés

```bash
npx tsx scripts/test-adaptation-ville.ts data/test-adaptation/colmar-raw.txt Colmar
```

Sortie dans `data/test-adaptation/output/` :
- `colmar-marc.md`, `colmar-annie.md`, `colmar-andre.md`, `colmar-adeline.md`, `colmar-sophie.md`
- **`colmar-profils.doc`** — document Word avec les 5 versions, prêt pour relecture.

---

## 4. Vérifications

Pour chaque profil, contrôler :

- **Slash-lists** : `[Cher,chère]` → « Cher » (Marc) / « chère » (Annie, Adeline, Sophie). `[seul,seule]` → correct selon genre.
- **Placeholders** : `[PRENOM]` → prénom réel ; `[PARTENAIRE]` / `[PARTENAIRE_COUPLE]` → prénom du partenaire ou « ta copine » / « ton copain » ; `[LISTE_AMIS]` → « Léo et Jean » ; `[ENFANTS_SUJET]` → « Léa et Tom ».
- **Tu/vous** : Sophie (vouvoiement) → « Vous pourrez… », « votre… », « vos… ».
- **Genre** : Annie, Adeline, Sophie → « elle » au lieu de « il » (sujet lecteur), « une voyageuse » au lieu de « un voyageur ».
- **Restaurants** : format préservé (Nom, Adresse, Cuisine, Ambiance, Prix, Note TA).

---

## 5. Ajouter une autre ville

Même commande avec un autre fichier :

```bash
npx tsx scripts/test-adaptation-ville.ts data/test-adaptation/strasbourg-raw.txt Strasbourg
```

Les profils sont définis dans `scripts/test-adaptation-ville.ts` (tableau `PROFILS`).
