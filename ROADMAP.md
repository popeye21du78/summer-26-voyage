# Reste à finaliser (produit)

- **Données** : persistance des voyages créés côté serveur (Supabase) au-delà du `localStorage`, synchronisation multi-appareils.
- **Compte** : parcours d’inscription / connexion complets, récupération de mot de passe, rôles (invité, propriétaire de voyage, ami).
- **Mon espace (itinéraire)** : après réordonnancement manuel des étapes, recalcul automatique des segments Mapbox (aujourd’hui, les jambes affichées restent les jambes d’ordre d’origine ; sinon repli sur distance à vol d’oiseau).
- **Partage** : liens publics de voyage / Viago, droits (qui peut éditer).
- **Inspirer / coups de cœur** : branchement complet vers les flux « planifier » et « coups de cœur » annoncés en UI.
- **Tests** : e2e sur les flux Préparer → Mon espace, et tests API Directions / géocodage (clé Mapbox requise en CI si on les active).

# Récemment couvert ici

- Itinéraire routier Mapbox (géométrie, km, durées) sur le parcours **Préparer** et **Tes propres villes** (`/preparer/mes-villes`), édition **date de départ** / **suppression d’étape** pour les voyages `created-*` dans **Mon espace**.
