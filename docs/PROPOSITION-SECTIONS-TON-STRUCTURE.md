# Proposition : sections, ton et structure (à valider avant code)

Document de proposition pour le remaniement des sections ville, du ton et des consignes de génération. **Ne pas toucher au code tant que cette proposition n’est pas validée.**

---

## 1. Règle d’or

- **N’invente rien.** Si la ville n’a pas d’histoire, pas d’anecdote, pas de resto : le dire clairement, en peu de mots. Pas de blabla pour atteindre un nombre de mots.
- **Longueur = fonction du niveau (note) de la ville.** Moins il y a à dire (niveau 1), plus les sections sont courtes. Niveau 4 : on peut aller plus long uniquement si le contenu le justifie (dates réelles, infos vérifiables, pas de remplissage).

---

## 2. Nouveaux noms des sections (et clés techniques proposées)

| Ancienne clé        | Nouvelle clé (proposée) | Nom affiché (UI)              |
|---------------------|-------------------------|--------------------------------|
| atmosphere           | **en_quelques_mots**    | [Ville] en quelques mots       |
| chroniques          | **point_historique**    | Le point historique            |
| guide_epicurien     | **bien_manger_boire**   | Bien manger et bien boire      |
| radar_van           | **arriver_van**         | Arriver en van                 |
| anecdote            | **anecdote**            | Anecdote                       |
| *(nouvelle)*        | **que_faire**           | Que faire                      |

*(On garde `anecdote` en clé. Nouvelle section « Que faire » : en mode « nous avons testé », activités/visites recommandées.)*

---

## 3. Ton et personnalité (prompt système proposé)

**Voix :** Un couple de voyageurs qui a roulé sa bosse, qui est allé partout, et qui se fait un plaisir de donner ses conseils.

- **Pronom :** « Nous » (nous avons visité, nous conseillons, nous avons testé…).
- **Style :** Précis et sérieux dans les infos (chiffres, adresses, tarifs), mais ton chaleureux, personnel, un peu pince-sans-rire quand il n’y a rien à dire — cohérent avec les textes du site (Barcelone, Pouilles, Lisbonne).
- **Exemples de ton à respecter :**
  - Formulations percutantes : « Barcelone en trois noms : Gaudi, Messi et Manuel Valls. »
  - Autodérision / vanité assumée : « Vanité car nous n’avons pas de van. Nous comprenons que sans lui, nous sommes condamnés à voyager de ville en ville… »
  - Concret et vécu : « Nous parcourons 20 km par jour. Nous ne verrons qu’à peine 1 % de ces terres sauvages… »
- **Pas de** : phrases creuses, inventées, ou longues tirades pour « faire du volume ». Markdown autorisé (listes, gras) pour la lisibilité.

**Proposition de prompt système (à mettre dans `SYSTEM_PROMPT`) :**

```
Tu es un couple de voyageurs expérimentés qui a roulé sa bosse et qui partage ses conseils sur le "Van-Life Journal". Tu parles toujours à la première personne du pluriel ("nous"). Tu es précis et sérieux sur les faits (chiffres, adresses, tarifs), mais ton style reste chaleureux, personnel, avec une pointe d’humour ou d’autodérision quand il n’y a rien à dire. Tu ne inventes jamais : si une ville n’a pas d’histoire, pas d’anecdote ou pas de resto, tu le dis clairement et brièvement. Tu écris en Markdown (listes, gras) pour structurer. Pas de phrases creuses ni de remplissage.
```

---

## 4. Longueur par niveau (ville)

| Niveau | Label (inchangé) | Volume cible par section (hors cas « rien à dire ») |
|--------|-------------------|----------------------------------------------------|
| 1      | Désert            | Très court : 50–120 mots par section. Si vraiment rien : 1–2 phrases. |
| 2      | Escale            | Court : 80–180 mots. |
| 3      | Pépite            | Moyen : 150–300 mots. |
| 4      | Métropole         | Plus long si justifié : 200–400 mots (jamais de blabla pour atteindre 1000). |

**Rappel :** Si la section n’a pas de contenu réel (ex. aucun commerce en niveau 1), terminer en 1–3 phrases sans inventer.

---

## 5. Structure et consignes par section

### 5.1 [Ville] en quelques mots (ex‑« atmosphere »)

**Objectif :** Description de base, fondamentaux.

**Contenu attendu :**
- Nombre d’habitants (ordre de grandeur ou chiffre si connu).
- Touristique ou pas (oui/non, ou « peu », « très »).
- Localisation et situation géographique : capitale de quelle région, placée où (fleuve, côte, montagne…), au milieu de quelle région.
- Ambiance en 2–3 phrases (ce qu’on ressent en arrivant).

**Consignes :**
- Données factuelles. Pas d’invention.
- Niveau 1 : 3–5 phrases max. Niveau 4 : un court paragraphe structuré (liste ou paragraphe).

---

### 5.2 Le point historique (ex‑« chroniques »)

**Objectif :** Quelques dates clés, pas un roman.

**Contenu attendu :**
- Fondation ou première mention connue (si elle existe).
- Deux événements marquants (vraiment liés à la ville ou à la région immédiate).
- Période d’apogée (si pertinent).

**Consignes :**
- Dates et faits vérifiables. **Aucune invention** (pas de fausses batailles, pas de légendes présentées comme de l’histoire).
- Niveau 1–2 : si pas d’histoire propre, 1–2 phrases (« Peu d’histoire propre ; la ville dépend de [X] » ou « Histoire surtout régionale ») + éventuellement une date régionale si fiable. Pas de broderie.
- Niveau 3–4 : liste ou paragraphe court (dates clés + 1 phrase par événement). Pas de 800 mots.

---

### 5.3 Bien manger et bien boire (ex‑« guide_epicurien »)

**Objectif :** Conseils concrets, localisation et prix.

**Contenu attendu :**
1. **Petit paragraphe d’intro** : spécialité locale (plat, produit) — si elle existe ; sinon une phrase.
2. **Quatre catégories** (à garder) :
   - Brunch / Café  
   - Dîner charme  
   - Verre / Apéro  
   - Nuit (bar, sortie…)
3. **Pour chaque adresse (si elle existe) :**
   - Nom du lieu.
   - **Adresse exacte** (rue, numéro, code postal, ville).
   - **Idée de prix en symboles €** : €, €€, €€€ (le nombre d’euros pourra être paramétré plus tard dans les paramètres du voyage).
   - Note TripAdvisor si trouvable (sinon ne pas inventer).
   - Une phrase sur l’ambiance ou ce qu’on y commande.

**Consignes :**
- Niveau 1 : si aucun commerce, dire clairement « Pas de resto/bar sur place ; prévoir frigo ou étape à X km ». Pas d’adresse inventée.
- Ne pas inventer de note TripAdvisor. Si pas trouvable : ne pas mettre de note.
- Adresses réelles uniquement (ville, rue, code postal). Pas d’« environ », « vers la place » sans adresse.

---

### 5.4 Arriver en van (ex‑« radar_van »)

**Objectif :** Où se garer, tarifs, alternatives.

**Contenu attendu :**
- **Au moins deux parkings** (si la ville en a) :
  - Adresse exacte.
  - Tarifs exacts (ou fourchette si variable).
  - Localisation précise (centre, périphérie, proche de…).
- **Proximité :** où aller à proximité si on est en village (autre village, ville proche).
- **Places gratuites :** possibilité de se garer gratuitement (où, sous quelles conditions). *(Plus tard : connexion API Google Places pour « endroits safe ».)*
- **Campagne / milieu de nulle part :** si le lieu est vraiment en campagne ou isolé, **renvoyer vers un lien Park4Night** (ou équivalent) au lieu d’inventer des parkings. Indiquer clairement : « Pour les spots bivouac et parkings en campagne, voir Park4Night » + lien si possible.

**Consignes :**
- Adresses et tarifs réels. Pas d’invention.
- Niveau 1 (campagne) : court paragraphe + renvoi Park4Night si pertinent.
- ZFE, barres de hauteur, vols : les mentionner uniquement si c’est le cas (villes / zones connues).

---

### 5.5 Anecdote

**Objectif :** Une anecdote ou un « secret » seulement si la ville en a un de réel.

**Contenu attendu :**
- **Si la ville a une anecdote, un fait insolite ou une légende connue** : la raconter en quelques phrases (court, percutant). Pas de nouvelle de 300 mots.
- **Si rien de fiable ou d’intéressant :** dire explicitement qu’il n’y a pas d’anecdote particulière (ou rien de vérifiable), en 1 phrase. **Ne pas inventer.**

**Consignes :**
- Niveau 1–2 : souvent « Rien de particulier à signaler » ou une seule phrase si une micro-légende locale existe vraiment.
- Pas de short story inventée pour faire du volume.

---

## 6. Résumé pour implémentation (après validation)

- **Sections :** 5 sections avec nouvelles clés et libellés (cf. tableau §2).
- **Ton :** « Nous », couple voyageur expérimenté, précis mais chaleureux, pas d’invention.
- **Longueur :** adaptée au niveau (1 = très court, 4 = plus long mais jamais de remplissage).
- **Contenu :** adresses exactes, tarifs, prix en € (symboles), note TripAdvisor si dispo ; renvoi Park4Night pour campagne ; anecdote seulement si elle existe.

Dès que tu valides cette proposition (ton + structure + noms), on pourra adapter le code (`city-prompts.ts`, `openai-ville.ts`, `CitySection.tsx`, `ville/[slug]/page.tsx`, et éventuellement la table `city_sections` si on renomme les clés).
