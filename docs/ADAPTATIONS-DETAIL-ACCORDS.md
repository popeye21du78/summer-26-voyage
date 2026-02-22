# Adaptations : détail des accords (ce que le code fait et ne fait pas)

Ce document précise **comment** le code adapte les textes (genre, tutoiement, placeholders) et ce qu’il **n’adapte pas**. À lire en complément de `ADAPTATIONS-TEXTES-VILLE.md` et du prompt API.

---

## 1. Apostrophe directe vs tournure indirecte

**Apostrophe directe** = on s’adresse **à** le lecteur en l’interpelant : il est le **destinataire** de la phrase.

- *« Mon cher [PRENOM], bienvenue à Toulouse. »*
- *« [PRENOM], tu sentiras vite que la ville… »*
- *« Mon cher [PRENOM], commence par la place du Capitole. »*

Ici, [PRENOM] est en position d’**allocutaire** (on lui parle).

**Tournure indirecte** = on parle **de** le lecteur ou on place son nom dans une formule type « conseil pour X ». Ce n’est **pas** une apostrophe directe.

- *« Avec [PARTENAIRE_AMIS], mon conseil **pour** [PRENOM] serait de commencer la soirée… »*

Le lecteur est l’objet du conseil (« pour [PRENOM] »), pas interpellé en tête de phrase. Le code remplace bien `[PRENOM]` et `[PARTENAIRE_AMIS]`, mais cette phrase ne devient pas plus « personnelle » par une forme d’appel ; c’est une phrase à la 2e personne (Tu pourras…) avec le prénom en complément.

**En résumé** : pour une vraie apostrophe directe, le prompt doit imposer des tournures du type **« Mon cher [PRENOM], … »** ou **« [PRENOM], tu … »** (s’adresser au lecteur en l’appelant). Les formules « mon conseil pour [PRENOM] serait… » restent utiles mais ne comptent pas comme apostrophe directe.

---

## 2. Comment le code adapte « Seul » en « Seule »

- **Méthode** : remplacement **strictement littéral** d’une seule chaîne.
- **Chaîne ciblée** : exactement `"Seul, "` (S majuscule, virgule, espace).
- **Remplacement** : `"Seule, "` lorsque `genre === "femme"`.
- **Où** : dans tout le texte (en pratique, surtout dans le bloc BONUS_SEUL).

**Ce que le code ne fait pas** :
- Pas d’adaptation de « Seul » sans virgule (« Seul au monde » restera inchangé).
- Pas de « seul » en minuscule.
- Pas de « Seuls » / « Seules » (pluriel) pour l’instant.
- Aucune analyse grammaticale : si le modèle écrit « Seul. Mon conseil… » (point au lieu de virgule), rien ne sera remplacé.

**Conséquence pour le prompt** : imposer la forme exacte **« Seul, mon conseil pour [PRENOM] serait… »** dans BONUS_SEUL pour que l’adaptation fonctionne.

---

## 3. Verbes : ce qui est adapté

En français, avec **tu** ou **vous**, le **verbe** ne varie pas selon le genre du lecteur :  
« tu es », « tu vas », « tu pourras » sont identiques pour un homme ou une femme.

Le code n’adapte donc **pas** les terminaisons verbales au genre. Il adapte **uniquement** la **personne** (tu → vous) quand `tutoiement === false` :

| Forme canonique (tu) | Forme affichée (vous) |
|----------------------|------------------------|
| Tu pourras            | Vous pourrez           |
| tu pourras            | vous pourrez           |
| Tu peux               | Vous pouvez            |
| tu es                 | vous êtes              |
| ton / ta / tes        | votre / vos            |
| tu / te               | vous                   |

Les paires sont définies dans `TU_VOUS_PAIRS` dans `lib/ville-adaptation.ts`. Toute forme « tu » non listée peut rester en « tu » après adaptation (selon l’ordre des remplacements et les regex).

---

## 4. Adjectifs et participes passés : non adaptés

Les **adjectifs** et **participes passés** qui s’accordent avec le **lecteur** (sujet ou complément d’objet) **ne sont pas adaptés** par le code.

Exemples **non gérés** (forme canonique masculin → on voudrait féminin pour une lectrice) :

- *Tu seras **ravi*** → pas de remplacement en *tu seras **ravie***
- *Tu es **allé*** → pas de remplacement en *tu es **allée***
- *Tu resteras **content*** → pas de remplacement en *tu resteras **contente***
- *Tu es **venu*** → pas de remplacement en *tu es **venue***
- *Tu peux être **fatigué*** → pas de remplacement en *tu peux être **fatiguée***

**Pourquoi** : faire ces accords correctement demande du contexte (savoir si l’adjectif/participe se rapporte au lecteur ou à un autre mot), et une liste fermée de formes serait incomplète ou risquée (faux positifs).

**Conséquences** :
- Soit on **évite** dans le prompt les tournures du type « Tu seras ravi », « Tu es allé », « Tu resteras content » pour le lecteur, et on privilégie des formulations neutres ou sans accord (« Tu pourras apprécier », « On retient que… »).
- Soit on prévoit plus tard une **extension** du code (liste de paires adjectif/participe masculin → féminin dans des contextes ciblés, ou règles plus fines).

Pour l’instant, le code adapte **uniquement** :
- **il** → **elle** (hors « il » impersonnel) ;
- **un** → **une** dans quelques expressions fixes (« un voyageur » → « une voyageuse », « tu es un » → « tu es une », etc.) ;
- **Mon cher** → **Ma chère** ;
- **Seul, ** → **Seule, **.

---

## 5. Récapitulatif : fait / pas fait

| Élément | Adapté par le code ? | Comment |
|--------|------------------------|--------|
| `[PRENOM]` | Oui | Remplacé par `prenom` du profil ou « toi ». |
| `[PARTENAIRE_COUPLE/FAMILLE/AMIS]` | Oui | Remplacé selon genre + tutoiement (ta copine, vos amis, etc.). |
| **`[ADJ:xxx]`** (adjectifs) | **Oui** | **Placeholders imposés par le prompt.** Table ADJ_TABLE : Seul, seul, content, ravi, fatigué, prêt, sûr → 4 formes (m/f × sing/plur). |
| **`[PP:xxx]`** (participes passés) | **Oui** | **Placeholders imposés par le prompt.** Table PP_TABLE : allé, venu, ravi, content → 4 formes. |
| Tu → vous (pronoms, possessifs, verbes) | Oui | Liste de paires + regex (tu, te → vous, etc.). |
| Il → elle (référence au lecteur) | Oui | Hors « il » impersonnel (il y a, il faut, etc.). |
| Un → une (lecteur) | Partiel | Quelques expressions fixes uniquement. |
| Mon cher → Ma chère | Oui | Remplacement littéral. |
| Seul, → Seule, | Oui | Remplacement littéral (rétrocompatibilité si Chat n’a pas encore mis [ADJ:Seul]). |
| Verbes (terminaison selon genre) | Non | Inutile en français pour tu/vous. |
| Adjectifs / PP **en dur** (sans placeholder) | Non | Le prompt doit imposer [ADJ:xxx] / [PP:xxx] partout où l’accord porte sur le lecteur. |
| Mes chers / Mes chères (pluriel) | Non | — |

---

## 6. Stratégie en place : placeholders [ADJ:xxx] et [PP:xxx]

Le **prompt** impose à Chat d’utiliser des **placeholders fermés** pour tout adjectif et participe passé qui s’accorde avec le lecteur :

- **Adjectifs** : `[ADJ:Seul]` (début de phrase), `[ADJ:seul]`, `[ADJ:content]`, `[ADJ:ravi]`, `[ADJ:fatigué]`, `[ADJ:prêt]`, `[ADJ:sûr]`.
- **Participes passés** : `[PP:allé]`, `[PP:venu]`, `[PP:ravi]`, `[PP:content]`.

Le **code** remplace chaque placeholder par la forme adaptée (masc/fem × sing/plur) selon `ProfilVille.genre` et `ProfilVille.pluriel`. Liste fermée côté code ; Chat ne doit utiliser que les clés documentées dans le prompt.

**Recommandations** : exiger des **apostrophes directes** (Mon cher [PRENOM], … ; [PRENOM], tu …) ; pour BONUS_SEUL utiliser **« [ADJ:Seul], mon conseil… »** (pas « Seul » en dur).
