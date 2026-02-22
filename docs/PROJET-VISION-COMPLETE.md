# PROJET — Vision complète

---

## I. POSITIONNEMENT ET DIFFÉRENCIATION

### Ce qu'on est
Un **outil unique** de conception, pilotage et documentation de voyages en van, centré sur la France (pour commencer). Pas un réseau social, pas un simple carnet. Un **assistant de voyage intelligent** avec une identité visuelle forte, un angle "beauté" et un ton décalé.

### Ce qu'on n'est pas (vs Polarsteps)
- Polarsteps = feed scrollable, réseau social, documentation *après coup*.
- Nous = **conception en amont** (itinéraire intelligent), **pilotage en live** (budget, ajustements), **rendu en sortie** (book one-page, pas un feed).

### 6 axes de différenciation
1. **Focus France** : un seul pays, mais une profondeur de contenu que personne n'aura (descriptions adaptatives, photos curatées, tags architecture, pépites départementales).
2. **Design radical** : pas du "app de voyage générique" — une identité signature à trouver.
3. **Ciblage vanlife** : tout est pensé pour ce mode de voyage (campings, Park4night, pas d'autoroute, rythme lent).
4. **Personnalisation poussée** : quiz identité + quiz pré-voyage → itinéraires vraiment différents d'un utilisateur à l'autre.
5. **Effet "agence de voyage"** : pages villes qualitatives, descriptions adaptées au profil, photos choisies (pas du Wikipedia brut).
6. **Budget "rat"** : zone de pilotage financier (avant + pendant le voyage), alertes, alternatives moins chères autour des villes onéreuses.

### Points communs avec Polarsteps (assumés)
- Carte + itinéraire visuel.
- Personnalisation / interactivité.
- Documentation du voyage au fur et à mesure.
- L'idée générale "planifier + vivre + raconter".

---

## II. PARCOURS UTILISATEUR COMPLET

### Étape 0 — Inscription / Connexion
- Création de compte (plus tard : email/mot de passe ou social login).
- Pour l'instant : profils de test (Marc, Sophie, etc.).

### Étape 1 — Quiz d'identité (une seule fois, modifiable)
Ce quiz définit le **profil permanent** de l'utilisateur. Il doit être **ludique** (pas un formulaire administratif) et **utile à l'algo**.

Informations à capter (propositions, à affiner ensemble) :
- **Prénom** (pour les descriptions adaptatives : "Marc, bienvenue à Uzès").
- **Âge** ou tranche d'âge (influence les suggestions : famille ? retraités ? jeunes ?).
- **Ville d'origine** (pour calculer la distance au point de départ du trip, et suggérer des escales).
- **Avec qui tu voyages habituellement** : solo / couple / famille / amis.
- **Tes goûts architecturaux** : colombages / vieilles pierres / brique / ardoise / "je m'en fiche" (questions visuelles : on montre des photos, l'utilisateur choisit).
- **Ton rapport mer / montagne / campagne / ville** : curseurs ou choix visuels.
- **Ton rythme naturel** : plutôt "on roule beaucoup et on voit plein de trucs" ou "on prend le temps, 2 étapes par jour max".
- **Budget** : plutôt "je dépense pas" / "raisonnable" / "je me fais plaisir".
- **Incontournables vs pépites** : "je veux voir les classiques" / "je cherche ce que personne ne connaît" / "un mix".

**Question ouverte** : faut-il demander "tu as un van ?" et "quel type de van ?" (ça pourrait influencer les suggestions de camping/stationnement) ? Ou c'est hors scope pour l'instant ?

Ce profil sert à :
- Adapter les descriptions des villes (ton, contenu).
- Pondérer les scores dans l'algo (si "montagne à fond" → score_montagne pèse lourd).
- Pré-remplir certains choix du quiz pré-voyage.

### Étape 2 — Page d'accueil (après quiz)
- Photo de fond facilement changeable (ton choix éditorial, ou saisonnière).
- Deux boutons principaux :
  - **"Découvrir des voyages"**
  - **"Planifier mon voyage"**
- Accès secondaire : "Mes trips", "Mon profil", "Modifier ma perso".

### Étape 3a — "Découvrir des voyages" (vitrine)
- Première question simple : **"Combien de jours ?"**
- Puis des **propositions clé en main** (itinéraires éditoriaux, les "mères" dont on parlait) :
  - "La route des cathédrales" (7 jours)
  - "Le Lot en 5 jours"
  - "Les plus beaux villages du Sud" (10 jours)
  - "Spécialités gastronomiques de Bretagne" (4 jours)
  - etc.
- Chaque proposition = une carte + un descriptif + un aperçu jour par jour.
- L'utilisateur peut **choisir un tour** et passer à la personnalisation (Étape 4).

### Étape 3b — "Planifier mon voyage" (sur mesure)
Deux chemins possibles (choix de l'utilisateur) :

**Chemin A — Full autonomie :**
- Formulaire : ville de départ, ville d'arrivée (ou boucle : retour au même point), dates.
- L'algo génère un itinéraire optimisé entre ces deux points, en passant par les meilleurs lieux selon le profil.

**Chemin B — Guidé par le mood :**
- Mini-quiz pré-voyage (5–8 questions max) :
  - **Région** (ou "peu importe").
  - **Rythme** pour ce voyage (cool / normal / intense).
  - **Activités prioritaires** : plages, randos, villages, patrimoine, gastronomie, musées…
  - **Mood** : contemplatif / aventurier / gourmand / culturel.
  - **Avec qui** : solo / couple / famille / amis (peut différer du profil permanent).
  - **Hébergement** : % airbnb vs camping vs van sauvage (Park4night).
  - **Durée** (en jours).
  - **Point de départ** (sa ville, pas forcément le début du trip).

**Question cruciale à trancher** : le point de départ, c'est **d'où il part physiquement** (sa maison) ou **d'où il veut que le trip commence** ?

Ma recommandation : demander **sa ville** (domicile). Si le trip est loin (ex. Paris → Sud), l'algo :
1. Calcule le trajet d'approche.
2. Suggère **une escale pépite sur la route** ("on te propose de dormir à Aubrac, tu ne connais pas, c'est sublime, tu arrives un jour plus tard mais le voyage commence dès la clé de contact").
3. Le trip "réel" commence le lendemain.

**Gestion des cas absurdes** : "Dieppe → Marseille en 2 jours sans autoroute" → l'app ne refuse pas, mais affiche un avertissement clair : "Ce trajet représente X heures de route. On te recommande au moins Y jours pour en profiter. Tu veux qu'on ajuste ?"  
Pas de minimum dur (pour ne pas refroidir ceux qui veulent juste 2 jours), mais une **recommandation intelligente** basée sur la distance.

### Étape 4 — Résultat : propositions d'itinéraires
L'algo génère **jusqu'à 3 variantes** :
- **Découverte** : les incontournables de la zone, ce qu'il faut avoir vu.
- **Connaisseur** : moins évident, plus de pépites, moins de "carte postale".
- **Pépites** : que du méconnu, hors des sentiers battus (avec option "tu veux quand même revoir les incontournables ?").

Chaque variante affiche :
- Carte avec le tracé (boucle ou A→B).
- Timeline jour par jour (étapes visite + étapes dodo).
- Temps de conduite estimé par jour.
- Tags dominants (mer, montagne, patrimoine…).
- Pourquoi on propose ça (2–3 phrases).

### Étape 5 — Personnalisation de l'itinéraire
Écran split : liste jour par jour (gauche) + carte (droite).

**Distinction fondamentale** entre deux types d'étapes :
- **Étape visite** : on passe quelques heures → apparaît sur la carte et dans l'itinéraire (point coloré).
- **Étape dodo** : on dort là → icône différente. Si le lieu de dodo n'a pas d'intérêt en soi, on affiche simplement "Dodo à proximité de [ville remarquable]" (pas besoin de le référencer comme un lieu).

Actions disponibles :
- **"Je connais"** → le lieu est marqué "déjà vu" (peut être retiré ou gardé, au choix).
- **"Ça ne me plaît pas"** → retiré, et 3–6 alternatives proches proposées (même zone, type compatible).
- **"Remplacer par…"** → choix parmi alternatives, avec explication ("plus calme", "plus patrimoine", etc.).
- **"Ajouter une destination"** → recherche Mapbox → enrichissement Wikipedia (photo + description) → insertion au bon endroit dans l'itinéraire (l'algo recalcule la cohérence du tracé).
- **Réordonner** (drag and drop).
- **"Valider la cohérence"** → contrôle automatique : pas trop de route/jour, pas de zigzag, contraintes respectées.

### Étape 6 — Mode voyage (pendant le trip)

**Écran "Aujourd'hui"** :
- Programme du jour : étapes prévues + trajets.
- **Géolocalisation** (si activée) : position actuelle sur la carte, progression en temps réel.
- **Météo du jour/lendemain** : si pluie prévue sur une étape outdoor (rando, plage), l'app **suggère** (pas de recalcul automatique) : "Il va pleuvoir demain à [rando X]. Voici 3 alternatives indoor proches : [musée Y], [abbaye Z], [dégustation W]. Tu veux remplacer ?"

**Validation du soir** :
- Bouton "Valider ma journée".
- L'utilisateur confirme ce qu'il a réellement fait (visité / pas visité).
- Il peut modifier : "en fait on a aussi fait [ville X]" ou "on a sauté [village Y]".
- Il peut **noter les étapes** (1–5 étoiles ou un système maison) → retour utilisateur pour affiner son profil et pour les futurs voyageurs.
- Il peut ajouter des photos et/ou une anecdote (voir Book ci-dessous).

### Étape 7 — Budget / Dépenses
Deux volets :

**Avant le voyage** :
- Budget prévisionnel (estimation globale).
- Section "préparation" : achats de matos, personnalisation du van, etc.

**Pendant le voyage** :
- Saisie simple : montant + catégorie (essence, nourriture, activité, camping…) + jour.
- Jauge visuelle : budget restant vs dépensé.
- Alerte si on dépasse.
- Pas d'estimation fine automatique (carburant, nuitées…) → juste du suivi réel, simple et "rat-friendly".

### Étape 8 — Book (après le voyage)
- **Format** : one-page (type page web longue, pas un feed).
- **Contenu** : sections par jour, avec encarts lieux, photos, anecdotes.
- **Photos** : l'utilisateur uploade, recentre dans un cadre (crop simple).
- **Templates** (plus tard) : choix parmi 2–3 mises en page identitaires.
- **Plus tard** : impression (album ? frise/rouleau ? — à explorer comme innovation, mais pas prioritaire).

---

## III. PAGES VILLES — L'EFFET "AGENCE DE VOYAGE"

### Le problème actuel
Les pages villes sont trop génériques (description Wikipedia brute, pas de "signature").

### La cible
- **3–4 photos curatées** par ville (pas du Wikipedia — tes propres photos ou des photos libres triées).
- **Description adaptative** : pas la même pour tout le monde.

### Comment faire des descriptions adaptatives sans usine à gaz

**Proposition concrète** (faisable avec ~10$ d'API OpenAI) :

1. **Identifier tes 100 "villes phares"** (celles qui offrent vraiment des choix différents selon le profil).
2. **Définir 4–5 profils-types** : ex. "contemplatif-patrimoine", "aventurier-outdoor", "gourmand-épicurien", "famille-détente", "pépites-insolite".
3. **Générer 4–5 descriptions par ville phare** via l'API OpenAI, avec des prompts très travaillés :
   - Chaque description met en avant **ce qui parle à ce profil** (le contemplatif : l'architecture, la lumière, l'histoire ; l'aventurier : les randos proches, les spots ; le gourmand : les spécialités, les marchés…).
   - Texte à trou pour le prénom : "Marc, imagine-toi arriver à Uzès un matin de marché…"
   - Ton décalé, pas encyclopédique. **C'est là que ta signature se crée.**
4. **Stocker en cache** (fichiers JSON ou base) : 100 villes × 5 profils = **500 descriptions**, générées une fois.
5. **Les 900 autres villes** : une seule description enrichie (Wikipedia retravaillée par l'API, avec ton ton), pas de variantes par profil (le gain est marginal pour des lieux secondaires).

**Faisabilité** : 500 descriptions de ~150 mots = ~75 000 tokens en sortie. Avec GPT-4o-mini, ça coûte environ 0.15$ en sortie + les tokens d'entrée (prompts). Très largement dans ton budget de 10$. Tu peux même monter à 1000 descriptions.

**L'envoi en arrière-plan** : oui, c'est faisable. Un script batch qui envoie les requêtes une par une (ou par petits lots), stocke les résultats dans des fichiers JSON. Pas besoin que ce soit en temps réel.

### Activités indoor / établissements dans les villes
- **Ne pas référencer chaque musée/dégustation comme une ligne séparée dans le tableau principal.**
- Plutôt : dans la description adaptative de la ville, mentionner les activités qui correspondent au profil. Le "contemplatif" voit "ne manquez pas le Musée du Duché" ; l'"aventurier" voit "louez un canoë sur le Gardon à 15 min".
- Si tu veux aller plus loin : une colonne **activites** dans le tableau (liste libre : "Musée du Duché, Marché samedi matin, Canoë Gardon") et l'algo/la description pioche dedans selon le profil.
- Pas de sous-tableau par ville. Pas de sous-catégories imbriquées. C'est de l'usine à gaz.

### Comment rendre les descriptions "signature" (pas mainstream)

Idées pour tes prompts API :
- **Ton** : comme si un ami local te racontait l'endroit (pas un guide touristique).
- **Accroche** : toujours commencer par une sensation ou une image ("Tu arrives par la petite route qui serpente, et là, d'un coup…").
- **Conseil inattendu** : un truc que personne ne dit ("Le vrai spot, c'est pas la place centrale, c'est la ruelle derrière la boulangerie à 7h du mat'").
- **Référence culturelle** : un film, un livre, une chanson liée au lieu.
- **"Le truc à ne PAS faire"** : "Ne va surtout pas au resto sur la place, c'est un piège à touristes. Va plutôt…"

---

## IV. STRUCTURE DES DONNÉES — LE GRAND CHANTIER

### Philosophie
- **1500 lieux** suffisent pour quadriller la France (~20 par département × ~75 départements intéressants + annexes).
- **Un tableau principal** pour les lieux "socle" (villages, villes, sites remarquables).
- **Des onglets/tableaux annexes** pour les données spécialisées (randos, plages, campings).
- **Pas de sous-catégories imbriquées** : un musée dans une ville n'est pas une ligne séparée, il est mentionné dans la description ou dans une colonne "activites".

### Tableau principal — "Lieux" (~1000–1500 lignes)

Colonnes :

**Identité :**
- id, nom, slug
- **type** : village / ville / site_naturel / chateau / abbaye / autre
- **tags** : liste libre séparée par des virgules (roman, gothique, colombages, pierres_blanches, brique, ardoise, mer, montagne, campagne, gastronomie, marché, panorama, médiéval, fortifié, fluvial, …)

**Localisation :**
- departement, lat, lng
- **region** (pour les filtres "tours par région")

**Données factuelles :**
- **population** (INSEE — pertinent pour villages/villes, vide pour les autres)
- **description** (texte court, enrichi par Wikipedia ou par toi)
- **activites** (liste libre : "Musée X, Marché samedi, Canoë Y" — pour alimenter les descriptions adaptatives)
- **specialite_culinaire** (ex. "aligot, truffade" ou "huîtres, vin blanc")

**Scores (0–10, uniquement quand pertinent) :**
- **score_beaute** : pertinent pour villages/villes/sites naturels. Pas pour un musée.
- **score_rando** : pour villages "bases de départ rando" → élevé. Pour les autres → 0 ou vide.
- **score_mer, score_montagne, score_campagne** : ambiance du lieu.
- **score_pepite** : à quel point c'est méconnu / hors des sentiers (0 = Carcassonne, 10 = village que personne ne connaît).
- **score_famille** : adapté aux familles (activités, sécurité, facilité).

**Scores qu'on retire ou repense :**
- score_taille → remplacé par population (c'est la même info, autant garder la donnée brute).
- score_ville → redondant avec type + population.
- score_coin_paume, score_metropole → redondants avec score_pepite + population.

**Infos voyage :**
- **plus_beaux_villages** (oui/non)
- **fete_village** (oui/non), **dates_fetes**
- **hebergement_proche** : texte libre ("Camping Les Oliviers 2km, Airbnb dès 45€") ou juste "camping / airbnb / park4night"
- **prix_indicatif_nuit** : fourchette (ex. "30-50" pour camping, "60-120" pour Airbnb)
- **notes** : tes notes éditoriales

### Comment gérer "un musée dans une ville" ou "une cathédrale dans une ville"

**Pas de sous-lignes.** Un musée dans Montpellier n'est pas une ligne du tableau. Il est mentionné :
- dans la colonne **activites** de la ligne Montpellier : "Musée Fabre, Place de la Comédie, Cathédrale Saint-Pierre"
- dans les **descriptions adaptatives** générées par l'API (le profil "culture" verra le musée mis en avant).

**Exception** : si un monument est tellement important qu'il justifie un **détour en soi** (ex. le Mont-Saint-Michel, le Pont du Gard, Carcassonne-la-cité), alors c'est une ligne à part entière, avec type = chateau / abbaye / site_naturel.

**Règle simple** : "est-ce que quelqu'un ferait un détour exprès pour ça ?" → oui = ligne séparée. Non = mentionné dans activites/description.

### Onglet annexe — Randos

Uniquement les randos référencées (pas toutes les randos de France, juste celles que tu recommandes).

| Colonne | Rôle |
|--------|------|
| id, nom, slug | Identité |
| **depart_lieu_id** | Lien vers le village du tableau principal (ex. "saint-guilhem-le-desert") |
| departement, lat_depart, lng_depart | Point de départ |
| tags | mer, montagne, forêt, crêtes, lac, famille… |
| **niveau** | facile / moyen / difficile / expert |
| **denivele_positif_m** | D+ en mètres |
| **distance_km** | Longueur |
| **duree_estimee** | Ex. "4h", "journée" |
| description | Itinéraire, ambiance, conseils |
| score_beaute | Beauté du parcours |
| notes | Tes notes |

### Onglet annexe — Plages

| Colonne | Rôle |
|--------|------|
| id, nom, slug | Identité |
| **proche_de_lieu_id** | Lien vers la ville la plus proche |
| departement, lat, lng | Localisation |
| tags | sable, galets, crique, surf, famille, sauvage, nudiste… |
| **type_plage** | sable / galets / crique / rochers |
| description | Accès, ambiance |
| score_beaute | |
| notes | |

### Onglet annexe — Campings / Hébergement (optionnel, plus tard)

| Colonne | Rôle |
|--------|------|
| id, nom | |
| **proche_de_lieu_id** | Lien vers le village |
| type | camping / aire_camping_car / park4night |
| prix_nuit | Fourchette |
| lat, lng | |
| notes | |

### Comment construire ces 1000+ lignes intelligemment

Ta bonne idée : **demander à ChatGPT les 20 lieux les plus remarquables par département, avec des tags**.

Workflow proposé :
1. Tu prépares un prompt bien calibré : "Donne-moi les 20 lieux les plus remarquables du département du Lot. Pour chaque lieu : nom, type (village/ville/chateau/abbaye/site_naturel), 5–10 tags parmi [liste de tags autorisés], une description de 2 phrases, et un score_beaute de 0 à 10."
2. Tu lances ça pour ~50 départements (les plus touristiques d'abord, puis les autres).
3. Tu colles les résultats dans ton Excel (ou un script les parse).
4. L'app enrichit avec Mapbox (coords) + INSEE (population).
5. **Tu valides et corriges à la main** (ChatGPT va se tromper sur certains : mauvais département, lieu qui n'existe pas, score incohérent).

C'est ~50 appels API, soit quelques centimes. Le gros du travail sera la **validation humaine**.

---

## V. ALGORITHME — COMMENT ÇA MARCHE CONCRÈTEMENT

### A. Sélection des lieux candidats

À partir du profil + du quiz pré-voyage, l'algo filtre :
1. **Zone géographique** : départements/région demandés, ou corridor entre départ et arrivée.
2. **Type** : si "montagne/rando" → favoriser type=village avec score_rando élevé + randos de l'annexe. Si "plage/surf" → favoriser lieux avec score_mer + plages de l'annexe.
3. **Tags** : si "colombages" → bonus aux lieux tagués colombages. Si "gastronomie" → bonus aux lieux avec specialite_culinaire rempli.
4. **Score pondéré** : chaque lieu reçoit un score composite = somme pondérée (score_beaute × poids_beaute + score_mer × poids_mer + score_pepite × poids_pepite + …), les poids venant du profil utilisateur.
5. **Filtre "Découverte/Connaisseur/Pépites"** : score_pepite bas → Découverte ; score_pepite haut → Pépites.

Résultat : une liste de ~30–80 lieux candidats, classés par score composite.

### B. Construction de l'itinéraire (la boucle)

C'est le point le plus délicat. Pas besoin d'un algorithme parfait (TSP exact = NP-difficile), mais d'une **heuristique raisonnable** :

1. **Point de départ et d'arrivée** fixés.
2. **Nombre de jours** fixé → nombre d'étapes max par jour (selon rythme : cool = 1–2, normal = 2–3, intense = 3–4).
3. **Algorithme "nearest neighbor amélioré"** :
   - On part du point de départ.
   - On choisit le prochain lieu parmi les candidats en optimisant : proximité + score + variété (ne pas enchaîner 3 villages identiques).
   - On vérifie qu'on ne s'éloigne pas trop du "corridor" départ → arrivée (pour éviter les zigzags).
   - On insère les randos/plages aux bons moments (ex. rando = demi-journée ou journée, à placer quand on est près d'un village-base avec score_rando élevé).
4. **Vérification de cohérence** : temps de route total/jour < seuil (selon rythme), progression géographique, pas de retour en arrière.
5. **Étapes dodo** : après chaque journée, on indique où dormir. Si le dernier lieu visité a un camping/hébergement → on dort là. Sinon → "dodo à proximité de [dernier lieu]".

### C. Distances et "pas d'autoroute"

- **Pas de matrice de distances pré-calculée** : trop lourd, inutile.
- À la génération d'itinéraire, on appelle **Mapbox Directions API** pour chaque segment (lieu A → lieu B), avec le paramètre **`exclude=motorway`** (oui, Mapbox le supporte nativement).
- On stocke en cache les segments déjà calculés (pour ne pas rappeler l'API si on recalcule).
- Coût : Mapbox offre 100 000 requêtes Directions/mois en plan gratuit. Largement suffisant pour commencer.

### D. Escale sur la route (domicile → début du trip)

Si le domicile de l'utilisateur est loin du début du trip :
1. Calculer le trajet domicile → premier lieu du trip (sans autoroute).
2. Si > 5h de route : chercher dans le catalogue un lieu avec un bon score sur le corridor, à mi-chemin.
3. Proposer : "On te suggère une escale à [lieu X] — tu ne connais pas, c'est une pépite. Tu arrives un jour plus tard mais le voyage commence dès la clé de contact."

### E. Hébergement intelligent (villages chers)

Pour les villages remarquables où l'hébergement est cher (Uzès, Saint-Rémy-de-Provence, etc.) :
- Identifier 1–2 villages proches (~15 min) avec hébergement moins cher.
- Proposer dans la personnalisation : "Uzès c'est sublime mais les nuits sont chères. Tu peux dormir à [village X] à 12 min, camping à 25€/nuit."

C'est une donnée à renseigner dans le tableau (colonne **hebergement_proche** ou **alternative_dodo**).

---

## VI. COÛTS API ET MONÉTISATION

### Coûts à surveiller
- **Mapbox** : gratuit jusqu'à 100 000 requêtes/mois (Directions + Geocoding). Au-delà : ~0.50$/1000 requêtes. Pour les premiers milliers d'utilisateurs, c'est gratuit.
- **OpenAI** : les descriptions sont générées **une fois** et cachées. Coût one-shot. Pas de coût par utilisateur.
- **Wikipedia** : gratuit, pas de limite raisonnable.
- **INSEE / geo.api.gouv.fr** : gratuit.

### À quel moment ça coûte
Quand chaque utilisateur génère un itinéraire → appels Mapbox Directions (ex. 15 segments = 15 appels). Si 1000 utilisateurs génèrent 3 itinéraires chacun = 45 000 appels/mois → encore gratuit.

### Pistes de monétisation (plus tard)
- Impression du book (album / frise / rouleau → marge sur l'impression).
- Version premium (plus de variantes, météo en temps réel, suggestions avancées).
- Affiliation campings / hébergements (si tu recommandes un camping et qu'il y a un lien affilié).
- Mais c'est un **troisième temps**.

---

## VII. NOTATION DES VILLES PAR L'UTILISATEUR

Ton idée : l'utilisateur note les étapes après les avoir visitées.

Ça sert à :
- **Affiner son profil** : s'il met 5/5 à tous les villages médiévaux et 1/5 aux villes → on ajuste ses poids pour les prochains trips.
- **Améliorer le catalogue** : si 50 utilisateurs notent un village 4.8/5, il remonte dans les suggestions pour tout le monde.
- **Éviter les redites** : "tu as déjà visité et adoré Cordes-sur-Ciel, on ne te le repropose pas (sauf si tu demandes)."

**Complexité algorithmique** : modérée. C'est un système de **filtrage collaboratif simple** (pas besoin de machine learning au début — juste des moyennes pondérées). Faisable à ton niveau.

---

## VIII. QUESTIONS OUVERTES QUI RESTENT

1. **Tags architecture** : quelle est ta liste définitive ? Colombages, vieilles pierres, brique, ardoise — et aussi roman, gothique, Renaissance, Art déco, fortifié, troglodyte… ? Plus tu as de tags, plus la personnalisation est fine, mais plus le remplissage est long.

2. **"Avec qui je suis" (solo/couple/famille/amis)** : comment ça influence concrètement l'itinéraire ? Famille = plus de score_famille ? Amis = plus de fête/gastronomie ? Il faut qu'on définisse les pondérations.

3. **Quiz pré-voyage vs profil permanent** : si le quiz pré-voyage contredit le profil (profil = "montagne à fond", quiz voyage = "cette fois je veux la mer") → **le quiz voyage prime**, c'est évident. Mais est-ce qu'on signale la contradiction ? ("Tiens, d'habitude tu préfères la montagne, ce voyage est très mer — c'est bien ce que tu veux ?")

4. **Nombre de départements à couvrir en V1** : les 96 métropolitains, ou tu commences par les 30–40 les plus touristiques du Sud/Sud-Ouest ?

5. **Photos des villes** : tes propres photos (qualité top, mais tu ne peux pas couvrir 1000 villes) ou photos libres (Unsplash/Wikimedia, qualité variable) ? Ou un mix (tes photos pour les 100 phares, Wikimedia pour le reste) ?

6. **Park4night / campings** : tu veux intégrer leur API (si elle existe) ou juste mettre un lien externe ?

7. **Le book "frise/rouleau"** : c'est une vraie innovation potentielle (personne ne fait ça). Tu veux qu'on garde ça en tête dès la structure des données (stocker les données dans un format qui permettrait une sortie linéaire/frise) ?

8. **Italie** : tu avais mentionné "France + Italie" au début. C'est toujours dans le scope, mais pour plus tard ? Ou on structure les données dès maintenant pour que ce soit extensible (colonne "pays") ?
