# Design System & Parcours Utilisateur (UX/UI) – Van-Life Journal

Document de référence pour le look, le feel et le parcours utilisateur du site. À utiliser pour toutes les phases de développement.

---

## Ambiance Générale (Look & Feel)

- **Palette** : "Organic & Minimalist"
  - Fond principal : **Beige Sable** `#F5F5F0`
  - Texte : **Vert Forêt Profond** ou **Gris Anthracite**
  - Accents : **Terracotta** (points sur la carte, boutons importants)

- **Typographie**
  - **Serif** pour les titres (ex. Playfair Display) – côté "Carnet de voyage"
  - **Sans-Serif** pour les données et textes longs (ex. Inter ou Geist)

- **Effets**
  - **Glassmorphism** (flou d'arrière-plan) pour les panneaux qui se superposent à la carte

---

## 1. L'Entrée : "The Gate" (Login)

- **Visuel** : Écran minimaliste, pas de barres de menu. Logo du projet au centre, subtilement animé (respiration).
- **Interaction** : Un champ de saisie unique, centré.
- **Transition** : À la validation du mot de passe, l'écran de login s'efface en fondu (fade-out), puis la Carte apparaît en zoom-out (effet d'ouverture).

---

## 2. La Page d'Accueil : "Le Cockpit" (Hero + Carte)

Page d'accueil par défaut après login. Structure scrollable.

### Structure verticale

- **En haut** : zone hero (accueil, titre du voyage).
- **En scrollant vers le bas** : carte interactive (pleine largeur, hauteur adaptée).

### La Carte (Fond)

- **Style** : Custom Mapbox "Beige Monochrome". Pas de routes mineures, pas de bruit. Juste frontières, océans, points d'intérêt.
- **Villes** : Points (dots) interactifs.
- **Tracé** : Courbes reliant les points chronologiquement (flux animé).

### L'Interface (Overlay)

- **Header flottant**
  - Gauche : Titre du voyage.
  - Droite : Menu (Accueil / Book / Data) – ou barre d'onglets en bas sur mobile.
- **Survol (desktop)** ou **clic (mobile)** sur une ville → **Popup** qui s'ouvre.
- **Contenu du Popup** :
  - Image de couverture de la ville.
  - Section scrollable avec l'essentiel (nom, date, J+X).
  - **3 boutons** :
    1. **Infos ville** → page dédiée `/ville/[slug]` (contenu codé en dur).
    2. **Voir dans le Book** → section de la ville dans `/book` (ou vide si pas créée).
    3. **Créer / Modifier** → page `/book/[slug]/editer` pour ajouter/modifier la page de la ville dans le Book.

---

## 3. La Page "The Book" (Le Cœur Émotionnel)

Monopage narrative (inspiration marques auto, Apple). Écrite au fur et à mesure du voyage via l'interface du site.

- **Structure** : Timeline verticale, chaque ville = une section full-screen.
- **Design** : Photo en fond full-bleed avec gradient, titre + date en overlay, fade-in au scroll. Galerie photos en grille (1, 2 ou 3 colonnes), texte en dessous.
- **Options typo** (par ville, éditables) : police titre (serif/sans), police sous-titre, gras, italique.
- **Layout photos** : single, grid2, grid3 selon le choix de l'utilisateur.
- **Deep-link** : `/book#paris` pour arriver sur une section.

### Page Créer / Modifier (`/book/[slug]/editer`)

Interface : texte, choix police titre/sous-titre, gras/italique, disposition galerie. Upload photos à brancher sur Supabase.

## 4. La Page Infos Ville (`/ville/[slug]`)

Page statique avec infos et photo de la ville (contenu codé en dur). Accessible via le bouton 1 du popup ville.

---

## 5. La Page "Data & Logistique" (Le Cerveau)

Style "Dashboard" épuré.

- **Jauge Carburant** : Graphique circulaire (budget essence consommé vs prévu).
- **Stats** : Grands chiffres (Big Numbers) – ex. "2450 km parcourus", "12 Villes visitées".
- **Tableau comparatif** : Liste des villes avec Budget Prévu vs Dépensé.

---

## 6. L'Expérience Mobile "En Voyage" (Mode Admin simplifié)

Sur iPhone en voyage : interface immédiate.

- **FAB (Bouton d'action rapide)** : Bouton "+" flottant en bas à droite, toujours visible.
- **Menu d'ajout** (au clic sur "+") : trois bulles
  - **Photo** : Ouvre caméra/galerie → Upload → Choix de la ville (auto selon date ou manuel).
  - **Anecdote** : Champ texte simple.
  - **Dépense** : Montant + Catégorie (Essence / Miam / Autre).

---

*Dernière mise à jour : Février 2026 – Architecture clarifiée, Phase 3*
