# Récap projet Van-Life Journal – pour reprendre avec un nouvel assistant

**Dernière mise à jour** : architecture clarifiée, avant Phase 3 (header nav, popup 3 boutons, accueil scrollable).

---

## Contexte

- **Projet** : Web App / PWA « Van-Life Journal » – planificateur + journal de bord + livre souvenir.
- **Stack** : Next.js 16 (App Router), React 19, Tailwind v4, TypeScript, Mapbox GL, Turf.js, Framer Motion, Lucide React.
- **Dossier** : `summer-26-prefailles-marseille` (à la racine de « Voyage voyage »).

---

## Architecture du site (texte)

### Page d'accueil (`/`)

- **En haut** : zone hero / accueil.
- **En scrollant vers le bas** : carte interactive avec les étapes.
- **Survol d'une ville** (desktop) ou **clic** (mobile) → **popup** avec :
  - une image ;
  - **3 boutons** :
    - **Infos ville** → page `/ville/[slug]` avec infos + photo (contenu codé en dur) ;
    - **Voir dans le Book** → section de la ville dans `/book` (ou vide si pas encore créée) ;
    - **Créer / Modifier** → page dédiée pour créer ou modifier la page de la ville dans le Book.

Le popup peut afficher une section scrollable avec l’essentiel avant d’ouvrir les pages.

### Page Infos ville (`/ville/[slug]`)

- Contenu statique : infos + photo codées en dur dans le site.
- Accessible via le bouton 1 du popup.

### The Book (`/book`)

- **Monopage** scrollable.
- Contenu écrit au fur et à mesure du voyage via l’interface du site (phase 4).
- Chaque ville peut avoir une section. Deep-link possible : `/book#paris`.
- Si la ville n’a pas encore de page → zone vide.
- Accessible via le menu « Voir le Book ».

### Page Créer / Modifier ville dans le Book (`/book/[slug]/editer`)

- Page dédiée pour écrire ou modifier la page d’une ville dans le Book.
- Accessible via le bouton 3 du popup.

### Data / Budget (`/data` ou via l’onglet Accueil)

- Dashboard : jauge essence, stats, tableau budget prévu vs dépensé.
- Accessible depuis la nav.

### Header / navigation

- **Accueil (Carte)** | **Book** | **Data**
- Donne accès à toutes les sections.

### Données

- Tout en **mock** côté client jusqu’à Phase 4 (Supabase).

---

## Phasage prévu (mémoire)

1. **Phase 1** – Fondations : types, mock data, login (code VAN2024). ✅ **Fait**
2. **Phase 2** – La carte : points, tracé courbe, flux animé, hover segment (distance, temps, péages). ✅ **Fait**
3. **Phase 3** – Accueil scrollable, header nav, popup ville (3 boutons), page infos ville, Book, page Créer/Modifier.
4. **Phase 4** – Backend & admin : Supabase, formulaire photos/textes.
5. **Phase 5** – Logistique : budget essence, API distances (OSRM/Google).

---

## Ce qui est en place (état actuel)

### Sécurité / accès

- **Login** : page `/login`, code **VAN2024**. Cookie `van_auth` posé par `app/api/auth/login/route.ts`. Middleware `middleware.ts` redirige vers `/login` si pas de cookie.
- Pas de bouton déconnexion pour l’instant.

### Données

- **Types** : `types/index.ts` – `Step`, `ContenuVoyage` (id, nom, coordonnées, date_prevue, description_culture, budget_prevu, contenu_voyage avec photos, anecdote, depenses_reelles).
- **Mock** : `data/mock-steps.ts` – 3 étapes (Paris, Bordeaux, Biarritz) avec données riches.
- **Péages** : `data/peages.ts` – coûts par segment (clé `"fromId-toId"`). À compléter. Voir `docs/peages.md`.

### Carte (page d’accueil après login)

- **Fond** : Mapbox (token dans `.env.local` : `NEXT_PUBLIC_MAPBOX_TOKEN`). Style light.
- **Points** : 3 villes = marqueurs terracotta, tooltip au survol « J+X – Ville ».
- **Tracé** :
  - Courbes entre villes (Turf.js `bezierSpline`) dans `lib/routeSegments.ts`.
  - **Aucun pointillé de fond** : une seule couche visible = **flux animé** en marron dégradé (#C4A484 → #8B7355).
  - **Flux** : 5 vagues qui avancent à vitesse uniforme (toute la ligne = une seule LineString `route-single`). Nouvelle vague visuelle tous les ~2 s (cycle 10 s). Vitesse basée sur le temps, pas sur le framerate.
- **Hover sur le tracé** : couche invisible `route-hit` (source `route` par segments). Popup avec : Ville A → Ville B, distance km, temps estimé, péages €.

### Fichiers importants

| Rôle | Fichier(s) |
|------|------------|
| Login | `app/login/page.tsx`, `app/api/auth/login/route.ts`, `middleware.ts` |
| Carte | `components/MapboxMapInner.tsx`, `components/MapboxMap.tsx`, `components/MapView.tsx` |
| Données trajet | `data/mock-steps.ts`, `data/peages.ts`, `lib/routeSegments.ts` |
| Types | `types/index.ts` |
| Design / UX | `docs/design-system-et-parcours-utilisateur.md` |
| Token Mapbox | `.env.local` (NEXT_PUBLIC_MAPBOX_TOKEN), `docs/mapbox-token.md` |

### Scripts

- `npm run dev` (avec `--webpack` dans package.json à cause de Turbopack qui plantait).
- Port souvent 3001 si 3000 est pris.

---

## Analyse : structure actuelle vs cible

### Ce qui existe aujourd'hui

| Élément | État actuel |
|---------|-------------|
| Route `/` | Page = MapView direct, carte plein écran, pas de hero, pas de scroll |
| Route `/login` | OK |
| Layout | Pas de header, pas de nav |
| Carte | Mapbox, points, tracé courbe, flux animé, hover segments (popup distance/temps/péages) |
| Villes | Marqueurs avec tooltip au survol (J+X – Ville) ; aucun clic sur ville |
| Middleware | Protège toutes les routes sauf `/login` et `/api` |

### Ce qui manque ou doit évoluer

| Besoin | Action |
|--------|--------|
| Header + nav | Créer composant Header avec liens Accueil \| Book \| Data ; l'intégrer dans le layout (ou page accueil) |
| Page accueil scrollable | Refactorer `/` : hero en haut + section carte en dessous (scroll vertical) ; la carte ne doit plus être h-screen seule |
| Popup ville (3 boutons) | Remplacer le tooltip actuel par un popup enrichi : image + section scrollable + 3 boutons ; gérer aussi le clic (mobile) en plus du survol |
| Pages manquantes | Créer `/ville/[slug]`, `/book`, `/book/[slug]/editer`, `/data` (placeholders si besoin) |
| Middleware | Vérifier que les nouvelles routes sont protégées (déjà le cas par défaut) |

### Points d'attention

1. **MapboxMapInner** : les marqueurs utilisent `onMouseEnter` / `onMouseLeave`. Ajouter `onClick` pour mobile et basculer le tooltip vers un popup avec contenu enrichi.
2. **MapView** : actuellement `h-screen`, la carte occupe tout l'écran. Pour la page scrollable, la carte sera dans une section avec hauteur fixe (ex. `min-h-screen` ou `h-[80vh]`).
3. **Données mock** : `mock-steps` et `peages` suffisent pour simuler ; pas de changement de structure nécessaire.

### Verdict

La structure actuelle est saine. Pas de refonte majeure : il s'agit d'**ajouts** (header, nouvelles pages, popup enrichi) et d'un **remaniement** de la page d'accueil (hero + scroll). Les composants carte sont réutilisables tels quels une fois insérés dans une section scrollable.

---

## Prochaines étapes possibles

- **Phase 3** : header nav (Accueil | Book | Data) ; page accueil scrollable (hero + carte) ; popup ville avec 3 boutons (Infos | Voir dans Book | Créer/Modifier) ; pages `/ville/[slug]`, `/book`, `/book/[slug]/editer`.
- **Phase 4** : Supabase (étapes, photos, textes), formulaire admin.
- **Phase 5** : calcul budget essence, appels API distances.

---

## Indications pour un nouvel assistant

- Ouvrir le **même dossier** (summer-26-prefailles-marseille).
- Lui dire : « On continue le projet Van-Life Journal ; tout est décrit dans `docs/RECAP-PROJET.md` et le design dans `docs/design-system-et-parcours-utilisateur.md`. On en est à la fin de la Phase 2, prochaine étape : [Phase 3 / drawer / etc.]. »
- Ne pas commiter `.env.local` (déjà dans .gitignore).
