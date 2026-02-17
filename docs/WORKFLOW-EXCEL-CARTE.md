# Workflow : ajouter des villes et voir les infos dans Excel

> **Note** : La carte utilise maintenant **lieux-central.xlsx** (4 onglets : Patrimoine, Pépites, Plages, Randos). Voir `data/cities/README.md`. Ce qui suit décrit l’ancien workflow avec data-villes.xlsx.

## En une phrase

Tu édites **data-villes.xlsx** (au moins la colonne **nom**), tu enregistres, tu fermes Excel, tu rafraîchis la page **Carte villes** : l’app enrichit les lignes et **réécrit le même fichier** avec population, description, département, lat, lng. Tu rouvres **data-villes.xlsx** pour tout voir.

---

## Étape par étape (ajouter plein de villes)

### 1. Ouvrir le bon fichier

- Fichier : **data/cities/data-villes.xlsx** (dans le projet).
- Ouvre-le avec Excel (double-clic ou Fichier > Ouvrir). Pas de souci de format : c’est un vrai .xlsx.

### 2. Remplir les villes

- La **première ligne** doit contenir les noms de colonnes. Si le fichier est vide, mets au minimum : **nom** (et si tu veux : **departement**, **notes**).
- **Une ligne = une ville.** Renseigne au minimum la colonne **nom** (ex. Toulon, Marseille, Saint-Cirq-Lapopie).
- Pour les homonymes, remplis aussi **departement** (ex. Var, Lot).
- Tu peux laisser vides : lat, lng, population, description, etc. Ils seront remplis au prochain rafraîchissement.

### 3. Enregistrer et fermer

- **Enregistrer** (Ctrl+S).
- **Fermer** le fichier Excel (important : tant qu’il est ouvert, l’app ne peut pas le réécrire).

### 4. Rafraîchir la carte

- Ouvre le site et va sur la page **Carte villes** (menu).
- **Rafraîchir** la page (F5 ou Ctrl+R).
- L’app lit data-villes.xlsx, appelle Mapbox (coordonnées), geo.api.gouv.fr (département, population), Wikipedia (description), puis **réécrit data-villes.xlsx** avec ces données.

### 5. Rouvrir l’Excel

- Rouvre **data-villes.xlsx**.
- Les colonnes **lat**, **lng**, **departement**, **population**, **description** sont maintenant remplies pour les lignes qui étaient vides. Tes autres colonnes (notes, scores, etc.) sont inchangées.

---

## Rôle des fichiers

| Fichier | Rôle |
|--------|------|
| **data-villes.xlsx** | Fichier à éditer. C’est lui qui est lu et **réécrit** après enrichissement. Tu y vois tout (population, description, etc.). |
| **cities-maitre.csv** | Copie générée par l’app (même contenu que l’Excel). Utile en backup ou pour d’autres outils. |
| **geocode-cache.json** | Cache des appels API (évite de rappeler à chaque fois). Ne pas éditer. |

Donc : **tu travailles uniquement avec data-villes.xlsx**. cities-maitre.csv est mis à jour automatiquement à chaque rafraîchissement de la carte.

---

## Ouvrir cities-maitre.csv dans Excel (sans problème de format)

Si tu ouvres le CSV en double-clic, Excel peut mal interpréter les accents ou le délimiteur. Pour que tout s’affiche correctement :

1. Dans Excel : **Données** > **Obtenir des données** > **À partir d’un fichier** > **À partir d’un fichier texte/CSV**.
2. Choisis **data/cities/cities-maitre.csv**.
3. Dans l’assistant : **Origine du fichier** = **65001 : Unicode (UTF-8)** ; **Délimiteur** = **Point-virgule**.
4. Clique sur **Charger**.

Tu peux ignorer le CSV si tu utilises seulement data-villes.xlsx.

---

## Colonnes utiles dans data-villes.xlsx

- **nom** (obligatoire), **departement** (recommandé pour homonymes).
- Remplis par l’app : **id**, **slug**, **lat**, **lng**, **departement**, **population**, **description**.
- À remplir par toi si tu veux : **score_beaute**, **notes**, **fete_village**, **dates_fetes**, **plus_beaux_villages**, etc.

La première ligne du tableau doit contenir ces noms de colonnes (en minuscules, sans accent pour id/slug/departement etc.).
