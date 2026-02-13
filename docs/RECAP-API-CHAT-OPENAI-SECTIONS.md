# Récapitulatif : API de contenu (OpenAI) par ville et par section

Document de référence pour la personnalité du « Copilote », le diagnostic des villes et le comportement d’OpenAI par section. **Tout est piloté depuis `lib/city-prompts.ts`** (et `lib/openai-ville.ts` pour l’appel API).

---

## 1. Flux global

1. **Ville** : l’utilisateur ouvre une page ville (ex. Bordeaux, Biarritz) identifiée par un `stepId` + nom de ville.
2. **Diagnostic** : au premier besoin, OpenAI évalue le « Potentiel Narratif » du lieu → **niveau 1 à 4** (mis en cache en DB).
3. **Sections** : chaque section (accordéon) appelle **POST /api/section-ville** avec `stepId`, `ville`, `sectionType`.  
   - Si le contenu existe en cache (table `city_sections`) → retour immédiat.  
   - Sinon : appel OpenAI avec le **prompt système** + le **prompt de section** (ville + niveau injectés), puis sauvegarde du résultat.

---

## 2. Personnalité actuelle (prompt système)

- **Rôle** : « Copilote du Van-Life Journal »  
- **Ton** : érudit, précis, un peu cynique mais bienveillant.  
- **Goûts** : histoire, bonne bouffe, aventure.  
- **Contraintes** : pas de phrases creuses, réponses en **Markdown riche**.

*(Défini dans `SYSTEM_PROMPT` dans `lib/city-prompts.ts`.)*

---

## 3. Comportement par « ville » : le diagnostic (niveau 1–4)

Avant toute génération de section, un **diagnostic** est exécuté (ou lu depuis le cache). Il classe le lieu :

| Niveau | Label        | Description courte |
|--------|--------------|--------------------|
| **1**  | Le Désert    | Hameau, lieu-dit, ville dortoir, zone industrielle. |
| **2**  | L’Escale Sympa | Petit bourg (église, boulangerie) ou ville moyenne fonctionnelle. |
| **3**  | La Pépite    | Village classé, « Plus beau village », spot naturel culte. |
| **4**  | Métropole / Historique | Grande ville chargée d’histoire ou capitale régionale. |

- **OpenAI** : un seul appel, prompt = `DIAGNOSTIC_PROMPT` avec `[VILLE]` remplacé. Réponse attendue = **un chiffre** (1, 2, 3 ou 4).  
- **Cache** : le niveau est stocké en DB (`section_type: "diagnostic"`, `content: "1"` à `"4"`). Toutes les sections de la même ville réutilisent ce niveau.

Le niveau est ensuite injecté dans **tous** les prompts de section sous la forme `[NIVEAU]` (ex. `3 (Pépite)`).

---

## 4. Comportement OpenAI par section

Chaque section = **un appel** `openai.chat.completions.create` avec :
- **Modèle** : `gpt-4o-mini` (défini dans `OPENAI_MODEL`).
- **Messages** :  
  - `system` = `SYSTEM_PROMPT` (personnalité commune).  
  - `user` = prompt de la section avec `[VILLE]` et `[NIVEAU]` remplacés.
- **max_tokens** : 2000 (sauf diagnostic : 10).

Résumé par section :

---

### 4.1 `atmosphere` — Atmosphère & Vibe

- **Rôle** : décrire l’atmosphère du lieu.
- **Selon le niveau** :  
  - **Niveau 1** : ton ironique / poétique du vide (silence, ennui, absence de réseau, repos absolu).  
  - **Niveaux 3–4** : dense (architecture, lumière, bruit, type de population).  
- **Contraintes** : ≥ 300 mots, style littéraire, métaphores, pas de « c’est calme » mais décrire les sons (ex. vent).

---

### 4.2 `chroniques` — Chroniques du Temps

- **Rôle** : raconter l’histoire de la ville (ou du contexte proche).
- **Selon le niveau** :  
  - **1–2** : pas d’invention (pas de fausses batailles). Élargir à la région/département, légende locale ou géologie. ≥ 300 mots.  
  - **3–4** : récit riche, 800–1200 mots, sous-titres Markdown, fondation, guerres, personnages, économie. Ton storytelling, pas de listes de dates.
- **Contraintes** : ton « raconteur d’histoires ».

---

### 4.3 `guide_epicurien` — Le Guide Épicurien

- **Rôle** : critique gastronomique local.
- **Demandé** : 1) Brunch/Café, 2) Dîner charme, 3) Verre/Apéro, 4) Nuit.
- **Selon le niveau** :  
  - **Niveau 1** : si aucun commerce, le dire avec humour (ex. vie nocturne = chouettes). Ne pas proposer d’adresse à > 15 km sans prévenir.  
  - **3–4** : très sélectif, pas le #1 TripAdvisor, lieux avec « âme », ambiance + quoi commander.
- **Contraintes** : ≥ 200 mots (ambiance globale + adresses).

---

### 4.4 `radar_van` — Radar Van-Life

- **Rôle** : analyse logistique pour un van ~6 m.
- **Selon le niveau** :  
  - **Village touristique (3)** : interdictions, barres de hauteur, police municipale, parkings périphériques.  
  - **Ville (4)** : ZFE, vols, trafic.  
  - **Campagne (1–2)** : bivouac sauvage toléré ou non.
- **Contraintes** : ~300 mots, ton « expert logistique », conseils de stationnement concrets.

---

### 4.5 `anecdote` — L’Anecdote ou Le Secret

- **Rôle** : une histoire insolite, fait divers, légende ou curiosité architecturale.
- **Si lieu trop petit** : légende du terroir (rayon ~10 km).
- **Contraintes** : rédigé comme une **nouvelle** (short story), ≥ 300 mots, du suspense.

---

## 5. Où tout changer

| Élément | Fichier | Variable / objet |
|--------|--------|-------------------|
| Modèle OpenAI | `lib/city-prompts.ts` | `OPENAI_MODEL` |
| Personnalité (ton, rôle) | `lib/city-prompts.ts` | `SYSTEM_PROMPT` |
| Diagnostic (échelle 1–4) | `lib/city-prompts.ts` | `DIAGNOSTIC_PROMPT` |
| Comportement par section | `lib/city-prompts.ts` | `SECTION_PROMPTS` (clés : `atmosphere`, `chroniques`, `guide_epicurien`, `radar_van`, `anecdote`) |
| Logique d’appel + cache | `lib/openai-ville.ts` | `runDiagnostic`, `generateSection` |
| API HTTP | `app/api/section-ville/route.ts` | POST, validation `sectionType` |

Pour **tout changer** (personnalité, ton, contenu par section et par niveau) : modifier en priorité **`lib/city-prompts.ts`** (prompts et modèle), puis ajuster si besoin la logique dans **`lib/openai-ville.ts`** (ex. autre modèle, autre usage du niveau).

---

*Rédigé pour la refonte de l’API de chat et de la personnalité par ville/section.*
