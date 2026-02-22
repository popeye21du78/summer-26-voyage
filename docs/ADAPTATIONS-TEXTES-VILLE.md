# Adaptations des textes ville (par le code)

Les textes générés par ChatGPT pour les fiches ville sont en **forme canonique** : masculin singulier, tutoiement (« tu »), et placeholders pour le partenaire de voyage. Le **code** applique les adaptations au moment de l’affichage (ou de l’export), sans modifier le contenu stocké.

---

## 1. Flux général

```
ChatGPT (prompt API)  →  Sortie brute avec délimiteurs ---ID---
        ↓
Stockage (optionnel)  →  Contenu par section (PRESENTATION, HISTOIRE_BASES, …) stocké tel quel
        ↓
Au moment de l’affichage / export  →  adaptText(contenu, profilUtilisateur)
        ↓
Texte affiché  →  Placeholders remplacés, tu/vous et genre appliqués
```

- **Stocké** : le texte canonique (avec `[PARTENAIRE_COUPLE]`, etc., et « tu »).
- **Affiché** : après passage par `adaptText(content, profile)` avec le profil de l’utilisateur (tutoiement, genre, type de partenaire, nombre d’enfants).

---

## 2. Profil utilisateur (entrée des adaptations)

Le profil passé à l’adaptation contient au minimum :

| Champ | Rôle |
|--------|------|
| `tutoiement` | `true` = garder « tu » ; `false` = passer en « vous » |
| `genre` | `"homme"` = garder masculin ; `"femme"` = adapter vers féminin (il→elle, un→une dans les bons contextes) |
| `typePartenaire` | `"couple"` \| `"famille"` \| `"amis"` \| `"seul"` → sert aux placeholders et au choix du bloc bonus affiché |
| `nbEnfants` | Optionnel ; pour adapter « tes enfants » / « ta famille » (ex. « avec tes deux enfants ») |

---

## 3. Placeholders (remplacement direct)

ChatGPT laisse dans le texte les chaînes exactes suivantes. Le code les remplace **avant** toute autre règle.

| Placeholder | Remplacé par (exemples) |
|-------------|-------------------------|
| `[PARTENAIRE_COUPLE]` | « ta copine » (lecteur homme), « ton copain » (lectrice femme), « votre partenaire » (vouvoiement), etc. |
| `[PARTENAIRE_FAMILLE]` | « tes enfants », « ta famille », « avec tes deux enfants » (si `nbEnfants` connu), « vos enfants » (vouvoiement), etc. |
| `[PARTENAIRE_AMIS]` | « tes amis », « vos amis » (vouvoiement), etc. |

Les valeurs exactes dépendent du `genre` et du `tutoiement` du profil.

---

## 4. Tutoiement / vouvoiement (tu → vous)

Quand `tutoiement === false`, on adapte le texte pour s’adresser au lecteur avec « vous ».

- **Pronoms** : tu → vous, te → vous, ton/ta/tes → votre/vos.
- **Verbes** : les formes en « tu » sont remplacées par les formes en « vous » (ex. tu pourras → vous pourrez, tu peux → vous pouvez, tu es → vous êtes).

En pratique, le module utilise une **liste de paires** (forme tu → forme vous) pour les tournures les plus fréquentes du prompt (Tu pourras, tu pourras y, vous pourrez, etc.), éventuellement complétée par des regex pour les cas génériques.

---

## 5. Genre (masculin → féminin)

Quand `genre === "femme"`, on adapte les références au lecteur (forme canonique = masculin) vers le féminin.

- **Pronoms** : il → elle (en excluant les « il » impersonnels : il y a, il faut, il est possible, etc.).
- **Déterminants / accords** : un → une lorsque c’est le lecteur ou un GN au féminin (contexte limité pour éviter des erreurs comme « une endroit »). En première version, on peut limiter aux phrases du bonus ou à une liste de chaînes.

On n’invente pas de texte : on ne fait que des **remplacements ciblés** sur le texte canonique.

---

## 6. Ordre d’application

1. **Remplacer les placeholders** avec le profil (type partenaire, genre, tutoiement, nbEnfants).
2. **Appliquer tu → vous** si `tutoiement === false`.
3. **Appliquer genre** (il→elle, un→une selon contexte) si `genre === "femme"`.

Ainsi, par exemple, « Avec [PARTENAIRE_AMIS], mon conseil serait … Tu pourras y déguster … » devient, pour une lectrice en vouvoiement : « Avec vos amis, mon conseil serait … Vous pourrez y déguster … » puis, si besoin, les accords féminins restants.

---

## 7. Où brancher l’adaptation (plus tard)

- **Affichage page ville** : après récupération du contenu par section (Supabase ou autre), appeler `adaptText(sectionContent, profile)` pour chaque bloc affiché.
- **Export Word / PDF** : idem sur chaque section avant de construire le document.
- **Choix des blocs** (profil « Connu/Inconnu », « Bases/Approfondi », « Intime/Animé ») : ce sera l’algo des tags (non implémenté pour l’instant) ; l’adaptation ne fait que transformer le **texte** des blocs déjà choisis.

---

## 8. Fichiers et usage

- **`lib/ville-adaptation.ts`** :
  - `ProfilVille`, `adaptText(content, profile)`, `adaptSections(sections, profile)`.
  - `parseRawSections(raw)` : parse la réponse brute (délimiteurs `---ID---`) en `Record<string, string>`.
  - `parseAndAdaptRawResponse(raw, profile)` : parse + adapte en une seule étape.
- **Test** : `npx tsx scripts/test-adaptation.ts` (exemples BONUS_COUPLE / AMIS / FAMILLE avec plusieurs profils). En cas d’erreur EPERM en local, exécuter les exemples à la main en important `adaptText` et `ProfilVille`.
