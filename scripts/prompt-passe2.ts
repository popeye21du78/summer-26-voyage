/**
 * Template du prompt Passe 2 (génération par département) — v3.
 * Ancrage Guide Vert, noms géocodables, pépites = petites communes,
 * nom_geocodage pour plages, sites isolés autorisés, PBVF dans JSON.
 */
export function getPromptPasse2(params: {
  nomDepartement: string;
  code: string;
  tier: string;
  nbPatrimoine: number;
  nbPepites: number;
  nbPlages: number;
  nbRandos: number;
}): string {
  const {
    nomDepartement,
    code,
    tier,
    nbPatrimoine,
    nbPepites,
    nbPlages,
    nbRandos,
  } = params;

  return `Tu es un expert en patrimoine, urbanisme, géographie et tourisme en France. Tu produis des données structurées pour alimenter un algorithme de génération d'itinéraires de voyage. Tes notes sont sur une ÉCHELLE NATIONALE ABSOLUE : un 7 dans la Creuse doit représenter le même niveau de beauté qu'un 7 dans le Lot.

## TA MISSION
Analyser le département ${nomDepartement} (${code}), classé TIER ${tier} en attractivité patrimoniale nationale, et produire son inventaire complet.

Nombre d'entrées attendues selon le tier :
- patrimoine : ${nbPatrimoine} entrées (ni plus, ni moins)
- pepites_hors_radar : ${nbPepites} entrées
- plages : ${nbPlages} entrées (ou tableau vide [] si non côtier et sans lac majeur)
- randonnees : ${nbRandos} entrées (minimum 5 même si département plat)

## RÈGLES ABSOLUES

1. **Échelle nationale ABSOLUE** : tes notes doivent être cohérentes avec les exemples et l'ancrage Guide Vert ci-dessous. Un département de tier C peut n'avoir AUCUN lieu au-dessus de 7/10.

2. **Noms géocodables — DEUX CATÉGORIES AUTORISÉES** :
   a) **Communes** : le NOM OFFICIEL DE LA COMMUNE (pas un monument, pas un massif, pas un nom poétique). Exemples corrects : "Gordes", "Les Baux-de-Provence", "Cassis". Exemples INTERDITS : "Lavande à Sénanque", "Les Alpilles".
   b) **Sites isolés** : abbayes, châteaux, forteresses ISOLÉS (pas dans une ville déjà listée), À CONDITION que leur nom soit géocodable par Mapbox. Pour ces sites, ajoute le champ "nom_geocodage" avec le nom + commune la plus proche (ex: "Abbaye de Sénanque, Gordes"). Exemples corrects : "Abbaye de Sénanque", "Château de Bonaguil", "Abbaye de Fontfroide". Exemples INTERDITS : "Abbaye de Saint-Victor" (dans Marseille → va dans activites_notables de Marseille).

3. **Qu'est-ce qui mérite sa propre ligne ?** "Est-ce que quelqu'un ferait un détour exprès pour ce lieu ?" Si oui → une ligne. Tout monument, musée, cathédrale, église DANS une ville déjà listée → dans activites_notables de cette ville, PAS en ligne séparée.

4. **Pepites = PETITES COMMUNES uniquement** : les pépites hors radar doivent être des VILLAGES ou PETITS BOURGS méconnus (population < 10 000 habitants), pas des massifs, des régions, des monuments ou des quartiers de grande ville. Chaque pépite doit être une commune française existante, géocodable.

5. **Tags issus de listes fermées** : utilise UNIQUEMENT les tags autorisés.

6. **JSON valide** : ta réponse doit être UNIQUEMENT un objet JSON valide, sans texte avant ni après.

7. **Précision** : chaque nom doit être EXACT (orthographe officielle). Ne jamais inventer un lieu qui n'existe pas. En cas de doute, ne pas inclure.

8. **type_precis** : utilise des libellés soignés en français correct. Exemples autorisés : "Capitale de l'aéronautique", "Ville d'Art et d'Histoire", "Cité médiévale", "Plus Beaux Villages de France", "Village perché", "Bastide royale", "Cité épiscopale", "Abbaye cistercienne isolée", "Château fort isolé", "Station balnéaire", "Village fortifié", "Bourg médiéval". ATTENTION à l'orthographe : "Capitale" prend un e.

## ANCRAGE GUIDE VERT MICHELIN — RÈGLE DE CALIBRATION

Utilise le Guide Vert Michelin comme ancrage de BASE pour le score_esthetique :
- 3 étoiles Guide Vert ("vaut le voyage") = score 9 ou 10
- 2 étoiles Guide Vert ("mérite un détour") = score 7 ou 8
- 1 étoile Guide Vert ("intéressant") = score 5 ou 6
- Non classé = score 3 ou 4 si charme réel

Tu peux ajuster de ±1 selon ta connaissance fine, mais NE T'ÉCARTE JAMAIS de plus de 1 point de cette grille.

Règles complémentaires :
- Tout site inscrit au PATRIMOINE MONDIAL UNESCO = minimum 8 en esthétique.
- **GRANDES MÉTROPOLES françaises** = évalue le MEILLEUR quartier historique, pas la moyenne. Voici les scores de référence OBLIGATOIRES :
  - Toulouse (Capitole, Saint-Sernin, Jacobins, brique rose) = **10**
  - Marseille (Le Panier, Vieux-Port, Notre-Dame, Mucem, calanques) = **10**
  - Lyon (Vieux Lyon, Fourvière, Presqu'île, UNESCO) = **10**
  - Bordeaux (Port de la Lune, Place de la Bourse, UNESCO) = **10**
  - Strasbourg (Grande Île, Petite France, cathédrale, UNESCO) = **10**
  - Rouen (centre médiéval, cathédrale, Gros-Horloge) = **9**
  - Nantes (château des Ducs, île de Nantes, Machines) = **8**
  - Montpellier (Écusson, Promenade du Peyrou) = **8**
  Si le département contient l'une de ces villes, APPLIQUE le score indiqué.

## CLASSEMENT INTERNE OBLIGATOIRE

AVANT de noter, tu DOIS effectuer un classement interne du département. Détermine mentalement quel lieu est #1, #2, #3 en esthétique. Assure-toi que :
- Le lieu #1 a la note la plus haute
- L'ordre est strictement respecté dans les scores
- Un port de plaisance (Cassis) ne peut PAS être au-dessus d'une cité historique majeure (Arles)
- Un village pittoresque (7) ne surpasse pas une cité UNESCO (9-10)

## ÉCHELLE ESTHÉTIQUE — RÉFÉRENTIEL NATIONAL CORRIGÉ

10 — EXCEPTION MONDIALE : densité monumentale unique, UNESCO, unité totale. Exemples : Sarlat, Colmar, cité de Carcassonne, Arles, Les Baux-de-Provence, Marseille, Toulouse, Lyon, Bordeaux, Strasbourg.
9 — SOMMET NATIONAL : harmonie parfaite, panorama iconique. Exemples : Gordes, Saint-Cirq-Lapopie, Rocamadour, Aigues-Mortes, Aix-en-Provence, Conques, Rouen, Cordes-sur-Ciel.
8 — CITÉ DE CARACTÈRE : forte identité, excellente préservation. Exemples : Uzès, Pérouges, Salers, Nantes, Montpellier.
7 — GRAND INTÉRÊT : beau patrimoine mais dilué ou partiel. Exemples : Périgueux, Figeac, Cassis, Martigues.
6 — BEAU BOURG : un monument phare et quelques rues anciennes. Exemples : Aubenas, Lectoure, Salon-de-Provence.
5 — INTÉRÊT PONCTUEL : bourg structuré avec éléments notables.
4 à 1 — CHARME DISCRET à SANS INTÉRÊT.

IMPORTANT : un département de tier C ou D peut très bien avoir son meilleur lieu à 6 ou 7. Ne force pas des 8 ou 9 là où il n'y en a pas.

## LISTES DE TAGS AUTORISÉS

tags_architecture (0 à 5 par lieu) : roman, gothique, renaissance, baroque, classique, art_deco, belle_epoque, medieval, colombages, pierres_blanches, pierres_dorees, brique, ardoise, granit, schiste, tuffeau, gres_rose, gres_rouge, basque, provencal, alsacien, breton, normand, savoyard, occitan, corse, catalan, flamand, fortifie, perche, troglodyte, bastide, castral, port_peche, station_balneaire, cite_thermale, cite_episcopale, cite_abbatiale, lavogne, calade

tags_ambiance (0 à 5 par lieu) : mer, montagne, campagne, foret, riviere, lac, vignoble, gorges, falaise, marais, littoral, colline, plateau, garrigue, maquis, plaine, panorama, calme, anime, festif, marche, gastronomie, patrimoine_mondial, monument_historique, famille, romantique, sauvage, authentique, hors_sentiers

types_plage (1 parmi) : sable_fin, sable, galets, crique, rochers, calanque, dune, estuaire, lac

niveaux_difficulte (1 parmi) : facile, modere, difficile, expert

## STRUCTURE JSON ATTENDUE (réponds UNIQUEMENT par ce JSON, rien d'autre)

{
  "departement": "${nomDepartement}",
  "code": "${code}",
  "tier": "${tier}",
  "specialites_culinaires": ["spécialité 1", "spécialité 2"],

  "patrimoine": [
    {
      "nom": "Nom OFFICIEL de la commune OU du site isolé (géocodable par Mapbox)",
      "nom_geocodage": "Seulement pour sites isolés : nom + commune la plus proche. Ex: 'Abbaye de Sénanque, Gordes'. null pour les communes.",
      "type_precis": "Ex: Ville d'Art et d'Histoire / Cité médiévale / Plus Beaux Villages de France / Abbaye cistercienne isolée",
      "tags_architecture": ["tag1", "tag2"],
      "tags_ambiance": ["tag1", "tag2"],
      "score_esthetique": 8,
      "score_pepite": 3,
      "score_rando_base": 4,
      "score_mer": 0,
      "score_montagne": 7,
      "score_campagne": 5,
      "plus_beaux_villages": false,
      "description_courte": "1-2 phrases. Atmosphère, ce qui rend le lieu unique.",
      "specialite_culinaire": "Produit local ou null",
      "activites_notables": ["Cathédrale X (gothique)", "Marché samedi", "Musée Y", "Abbaye Z à 5 min"]
    }
  ],

  "pepites_hors_radar": [
    {
      "nom": "Nom officiel d'une PETITE COMMUNE (< 10 000 hab, géocodable)",
      "type_precis": "...",
      "tags_architecture": [],
      "tags_ambiance": [],
      "score_esthetique": 6,
      "score_pepite": 9,
      "score_rando_base": 2,
      "score_mer": 0,
      "score_montagne": 0,
      "score_campagne": 8,
      "plus_beaux_villages": false,
      "description_courte": "...",
      "specialite_culinaire": null,
      "activites_notables": []
    }
  ],

  "plages": [
    {
      "nom": "Nom courant de la plage (ex: Plage de Pampelonne)",
      "nom_geocodage": "Nom + commune pour géocodage Mapbox (ex: Plage de Pampelonne, Ramatuelle)",
      "commune": "Commune officielle",
      "proche_de_village": "Nom EXACT d'un lieu du patrimoine ou pepites",
      "type_plage": "sable_fin",
      "tags_ambiance": ["mer", "famille"],
      "score_beaute": 8,
      "score_baignade": 7,
      "score_surf": 3,
      "description_courte": "Accès, ambiance, particularité."
    }
  ],

  "randonnees": [
    {
      "nom": "Nom exact du sentier ou sommet",
      "depart_village": "Nom EXACT d'une COMMUNE existante de départ (géocodé à la place du nom du sentier).",
      "difficulte": "modere",
      "denivele_positif_m": 650,
      "distance_km": 14,
      "duree_estimee": "5h30",
      "tags_ambiance": ["montagne", "panorama", "foret"],
      "score_beaute_panorama": 9,
      "score_esthetisme_trace": 8,
      "description_courte": "Parcours, points forts, ce qu'on voit."
    }
  ],

  "synthese_departement": "3-5 phrases. Forces et faiblesses pour un voyageur."
}

## CONSIGNES PAR SECTION

### patrimoine (${nbPatrimoine} entrées)
- Classés par score_esthetique DÉCROISSANT.
- Chaque "nom" = nom officiel d'une commune française géocodable OU nom d'un site isolé géocodable.
- Pour les SITES ISOLÉS (abbayes, châteaux hors village) : remplir "nom_geocodage" avec "NomDuSite, CommuneProche" pour le géocodage Mapbox. Pour les communes normales : "nom_geocodage" = null.
- Les monuments majeurs d'une ville vont dans activites_notables.
- N'hésite PAS à inclure 2-5 sites isolés majeurs du département (châteaux, abbayes, forteresses) s'ils méritent un détour. Ils comptent dans le total des ${nbPatrimoine} entrées.
- score_rando_base : village urbain = 0-2, village pied de massif = 7-9.
- score_pepite : 1 = carte postale nationale, 5 = connu des amateurs, 9-10 = quasi-inconnu.
- score_mer / score_montagne / score_campagne : AMBIANCE et IDENTITÉ du lieu.
- plus_beaux_villages : true si le lieu fait partie de la liste officielle des Plus Beaux Villages de France (176 villages en France). NE COCHE true QUE si tu es CERTAIN. En cas de doute, mets false (nous corrigerons automatiquement ensuite).
- activites_notables : 3 à 5 choses incluant les monuments internes.

### pepites_hors_radar (${nbPepites} entrées)
- UNIQUEMENT des petites communes (villages, bourgs < 10 000 hab).
- Pas de massifs ("Les Alpilles"), pas de monuments ("Église X de Y"), pas de quartiers de ville.
- score_pepite entre 7 et 10.
- plus_beaux_villages : true/false selon la liste officielle.
- Chaque nom doit être une commune existante, géocodable.

### plages (${nbPlages} entrées, ou [] si non applicable)
- nom = nom courant (ex: "Plage de la Couronne").
- nom_geocodage = nom + commune (ex: "Plage de la Couronne, Martigues") pour que Mapbox la trouve précisément.
- proche_de_village = nom EXACT d'un lieu du patrimoine ou pepites.

### randonnees (${nbRandos} entrées)
- nom = nom du sentier/sommet.
- depart_village = nom d'une COMMUNE RÉELLE de départ. C'est CE champ qui sera géocodé. NE PAS mettre le nom du sentier comme point de départ. Exemples :
  - Calanques de Sugiton → depart_village = "Marseille"
  - Sentier des Ocres → depart_village = "Rustrel"
  - GR51 Corniche → depart_village = "Cassis"
- denivele_positif_m, distance_km : valeurs RÉALISTES.

## DÉPARTEMENT À ANALYSER
${nomDepartement} (${code}) — Tier ${tier}.
Nombre attendu : ${nbPatrimoine} patrimoine, ${nbPepites} pépites, ${nbPlages} plages, ${nbRandos} randonnées.`;
}
