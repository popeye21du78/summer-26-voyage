# Méthode d’adaptation — une infinité de textes

Ce document récapitule la **méthode complète** permettant d’adapter un nombre illimité de fiches ville à chaque profil utilisateur, **sans IA au runtime**, uniquement par remplacements de placeholders et de slash-lists.

---

## 1. Principe général

1. **Chat** génère un **template** (texte avec placeholders) pour chaque ville.
2. Le **code** remplace chaque placeholder selon le **profil** (genre, tutoiement, partenaire, amis, enfants, etc.).
3. Chaque fiche peut être adaptée à l’infini : il suffit de changer le profil.

**Aucune IA au runtime** : uniquement des lookups dans des tables et des remplacements par chaîne.

---

## 2. Placeholders et slash-lists

### 2.1 Placeholders identité / partenaire

| Placeholder | Remplacé par | Données profil requises |
|-------------|--------------|--------------------------|
| `[PRENOM]` | Prénom du lecteur | `prenom` |
| `[PARTENAIRE]` | Prénom du partenaire ou « ton copain » / « ta copine » | `partenaire.prenom`, `partenaire.genre` |
| `[PARTENAIRE_FAMILLE]` | « tes enfants », « tes 2 enfants », etc. | `nbEnfants` |
| `[LISTE_AMIS]` | « Marc », « Marc et Paul », « Marc, Paul et Sophie » | `amis[]` (prénoms) |
| `[ENFANTS_SUJET]` | « Léa », « Léa et Tom », « Léa, Tom et Emma » | `enfants[]` (prénoms) |

### 2.2 Slash-lists (accords)

**Format** : `[forme1,forme2,forme3,forme4]`  
**Ordre** : masculin singulier, féminin singulier, masculin pluriel, féminin pluriel.

Le code sélectionne la forme selon `genre` et `pluriel` du destinataire (P1, P2, ou groupe).

**Exemples** :
- `[seul,seule,seuls,seules]` → pour P1 seul(e) ou groupe
- `[enchanté,enchantée]` → pour le partenaire (accord avec P2)
- `[le,la]` → pronom pour le partenaire
- `[un,une] [expert,experte]` → pour P1
- `[satisfait,satisfaite,satisfaits,satisfaites]` → pour le groupe

**Avantage** : vocabulaire **illimité**. Chat peut utiliser n’importe quel adjectif/participe en slash-list ; le code n’a pas de table fixe, il split sur la virgule et prend l’index selon le profil.

---

## 3. Les 4 sections BONUS (apostrophe directe)

Chaque section **s’adresse directement** à un type de profil :

| Section | Destinataire | Accords |
|---------|--------------|---------|
| **BONUS_SEUL** | La personne seule (P1) | Genre P1 (seul/seule) |
| **BONUS_COUPLE** | Le couple (P1 + partenaire) | Genre P2 pour « enchanté », « le/la » |
| **BONUS_AMIS** | Le groupe d’amis (P1 + amis) | Groupe (satisfaits/satisfaites selon composition) |
| **BONUS_FAMILLE** | La famille (P1 + partenaire + enfants) | Enfants sujet → pourra/pourront ; P2 pour partenaire |

**Apostrophe directe** = on parle **à** le destinataire, pas **de** lui. Ex. : « [PRENOM], tu pourras… » et non « Mon conseil pour [PRENOM] serait… ».

---

## 4. Anti-répétitions (100 villes) : variété sans templates

Sur 100 villes, un modèle retombe naturellement sur des “tics” (“On retient…”, “Tu comprendras vite…”, etc.). Pour éviter des formules permanentes **sans** templates figés :

- **Dans le prompt** : ban-list de tics + règles strictes de fréquence de `[PRENOM]` + obligation de varier amorces/chutes.
- *(Optionnel, si l’API le supporte)* : un léger `frequency_penalty` / `presence_penalty`.
- **Après génération** : contrôle automatique (regex) des tics interdits et des contraintes (ex. `[PRENOM]` trop présent, slash-lists mal formées). Si un check échoue : régénérer la/les sections fautives.

---

## 5. Profil enrichi (paramètres nécessaires)

Pour que l’adaptation soit complète, le profil doit contenir :

| Paramètre | Type | Utilisation |
|-----------|------|-------------|
| `genre` | `"homme"` \| `"femme"` | Accords P1 (seul/seule, content/contente, etc.) |
| `tutoiement` | `boolean` | tu → vous, ton → votre, etc. |
| `prenom` | `string?` | [PRENOM] |
| `pluriel` | `boolean?` | Accords pluriel (contents, allés, etc.) |
| `typePartenaire` | `"seul"` \| `"couple"` \| `"famille"` \| `"amis"` | Quel bloc BONUS afficher |
| `nbEnfants` | `number?` | PARTENAIRE_FAMILLE, ENFANTS_SUJET |
| `partenaire` | `{ prenom: string, genre: Genre }?` | [PARTENAIRE], [enchanté/enchantée], [le/la] |
| `enfants` | `{ prenom: string }[]?` | [ENFANTS_SUJET], pourra/pourront |
| `amis` | `{ prenom: string, genre?: Genre }[]?` | [LISTE_AMIS], satisfaits/satisfaites |

---

## 6. Flux complet

```
1. Utilisateur demande fiche pour "Colmar"
2. Code charge le prompt de base (docs/prompt-ville-api.md)
3. Code envoie à l'API : message système = prompt, message user = "Génère la fiche pour Colmar"
4. API renvoie le texte avec placeholders et slash-lists
5. Code parse les sections (---ID---)
6. (Recommandé) Code vérifie les contraintes (tics interdits, `[PRENOM]` trop fréquent, slash-lists invalides, `Note TA` ≠ `—`). Si échec : régénérer la section fautive.
7. Pour chaque section affichée, code appelle adaptText(section, profil)
   - Remplace [PRENOM], [PARTENAIRE], [LISTE_AMIS], etc.
   - Remplace les slash-lists [masc,fem,...] par la forme correcte
   - Applique tu → vous si besoin
   - Applique il → elle, Mon cher → Ma chère si femme
8. Texte adapté affiché à l'utilisateur
```

---

## 7. Récapitulatif : pourquoi « infinité de textes » ?

- **Villes** : autant qu’on veut (100, 500, 1000) — Chat génère une fiche par ville.
- **Profils** : combinaisons de genre × tutoiement × partenaire × amis × enfants.
- **Variété** : apostrophes cohérentes avec la ville + règles anti-tics + (optionnel) pénalités API + contrôle post-génération.
- **Accords** : slash-lists permettent tout adjectif/participe sans table fixe.

Le même texte généré (ex. fiche Colmar) s’adapte à chaque profil sans regénération.
