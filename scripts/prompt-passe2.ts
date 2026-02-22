/**
 * Template du prompt Passe 2 (génération par département) — v7.
 * PBVF injectés en amont. GPT score les PBVF (8-10) et complète le delta.
 * Randos retirées du prompt (100% Overpass).
 */

import type { ContexteDepartement } from "../lib/profils-departement";

export function getPromptPasse2(
  ctx: ContexteDepartement,
  pbvfNames: string[] = [],
  nbComplement?: number,
): string {
  const {
    code,
    nomDepartement,
    tier,
    nbPatrimoine,
    nbPepitesMin,
    cotier,
    nbPlages,
  } = ctx;

  const sectionPlages = buildSectionPlages(nbPlages, cotier);
  const complement = nbComplement ?? nbPatrimoine;
  const hasPbvf = pbvfNames.length > 0;

  const pbvfSection = hasPbvf
    ? `
## PLUS BEAUX VILLAGES DE FRANCE (DÉJÀ INCLUS)

Les ${pbvfNames.length} villages suivants sont des PBVF officiels de ce département. Ils sont DÉJÀ INCLUS dans le total patrimoine. **NE LES INCLUS PAS dans "patrimoine".**

${pbvfNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Pour chacun, fournis dans **"patrimoine_pbvf"** : score_esthetique (8, 9 ou 10 UNIQUEMENT), score_notoriete, tags_architecture, tags_cadre, description_courte (1-2 phrases), activites_notables.
`
    : "";

  return `Tu es un expert en patrimoine et tourisme en France. Tu produis des données structurées. Suis EXACTEMENT le workflow ci-dessous.

## WORKFLOW OBLIGATOIRE (respecte l'ordre)

**Étape 1 — Sélection** : Établis la liste des ${complement} lieux les PLUS REMARQUABLES du département (communes ou sites isolés)${hasPbvf ? ` EN EXCLUANT les ${pbvfNames.length} PBVF listés ci-dessous (ils sont déjà pris en charge)` : ""}. Trie mentalement par importance patrimoniale et beauté. Si tu en as 40 en tête, GARDE UNIQUEMENT les ${complement} meilleurs.

**Étape 2 — Barème esthétique** : Pour chaque lieu retenu, applique STRICTEMENT le barème score_esthetique ci-dessous (référentiel national). Ne devine pas : un lieu exceptionnel = 10, un bourg modeste = 5 ou 6.

**Étape 3 — Score notoriété** : Pour chaque lieu, attribue score_notoriete selon la règle : 1 = connu mondialement, 10 = quasi inconnu du grand public.

**Étape 4 — Tags** : Attribue tags_cadre et tags_architecture (listes fermées ci-dessous).
${hasPbvf ? "\n**Étape 5 — Scoring PBVF** : Pour chaque PBVF listé, attribue un score_esthetique (8, 9 ou 10 uniquement), score_notoriete, tags et description dans \"patrimoine_pbvf\"." : ""}

## DÉPARTEMENT
${nomDepartement} (${code}), tier ${tier}.
${pbvfSection}
## NOMBRES EXACTS À PRODUIRE
- patrimoine : **exactement ${complement} entrées** (ni plus ni moins)${hasPbvf ? ` — ce sont les ${complement} MEILLEURS LIEUX HORS PBVF` : ""}. Parmi elles, au moins ${nbPepitesMin} avec score_notoriete >= 7 (villages méconnus).${hasPbvf ? `\n- patrimoine_pbvf : **${pbvfNames.length} entrées** (scores et tags des PBVF ci-dessus).` : ""}
${nbPlages > 0 ? `- plages : **${nbPlages} entrées**.` : "- plages : ce département n'a pas de littoral/lac notable. Produis un tableau vide [] pour \"plages\"."}

## BARÈME score_esthetique (APPLIQUE-LE STRICTEMENT — OPTIQUE VACANCES)

Référentiel NATIONAL, perspective VACANCES EN VAN. Ce qui compte : la beauté du lieu pour un voyageur, PAS la taille de la ville. Un 7 en Creuse = même niveau qu'un 7 dans le Lot. Une métropole sans charme touristique vaut 4-5, même si elle est grande.

**10 — Exception mondiale** : UNESCO, densité monumentale unique, paysage iconique. Un voyageur y passe 2-3 jours émerveillé.
- Arles = 10, Les Baux-de-Provence = 10, Marseille = 10.
- Paris, Toulouse, Lyon, Bordeaux, Strasbourg, Sarlat, Carcassonne, Colmar, Nice, Avignon, Versailles, La Rochelle, Cannes = 10.

**9 — Remarquable** : destination vacances majeure, excellente préservation.
- Nantes, Pau, Nîmes, Metz, Béziers = 9. Tous les PBVF = 8 à 10.

**8 — Cité de caractère** : forte identité, destination vacances plaisante.
- Aix-en-Provence, Annecy, Lille, Toulon, Angers, Orléans = 8.

**7 — Grand intérêt** : patrimoine réel mais pas une destination vacances majeure.
- Perpignan, Dijon, Besançon, Mulhouse, Antibes, Troyes, Valence, Hyères, Fréjus, Narbonne, Ajaccio = 7.

**5-6 — Intérêt partiel** : 1-2 points d'intérêt, globalement peu attractif pour des vacances.
- Montpellier = 6, Clermont-Ferrand = 6, Reims = 6, Rouen = 6, Caen = 6, Nancy = 6.
- Rennes = 5, Poitiers = 5, Limoges = 5, Chambéry = 5.

**3-4 — Ville fonctionnelle** : PAS une destination vacances. Ne pas surévaluer une ville juste parce qu'elle est grande.
- Saint-Étienne = 4, Le Mans = 4, Tours = 4, Chartres = 4.
- Brest = 3, Grenoble = 2, Lorient = 3.

**RÈGLE CRITIQUE** : être une grande ville NE DONNE PAS un score élevé. Bordeaux = 10 car le centre est sublime. Grenoble = 2 car le centre n'a rien de remarquable pour un vacancier.

## BARÈME score_notoriete (ANTI-HALLUCINATION)

- **1–2** : Carte postale mondiale (Mont-Saint-Michel, Carcassonne, Les Baux).
- **3–4** : Très connu (Gordes, Eze, Cassis).
- **5–6** : Connu des amateurs de la région.
- **7–8** : Méconnu du grand public.
- **9–10** : Quasi inconnu. **Exemple : Fuveau = 9 ou 10, pas 7.** Soit c'est connu (1–6), soit c'est méconnu (9–10).

## RÈGLES GÉNÉRALES

- Noms : NOM OFFICIEL de la commune ou du site. Sites isolés → "nom_geocodage" : "NomDuSite, Commune".
- Une ligne = un lieu. Monuments dans une ville déjà listée → dans activites_notables.
- plus_beaux_villages : true UNIQUEMENT si PBVF officiel. Sinon false.
- JSON valide uniquement, sans texte avant ni après.

## TAGS AUTORISÉS

tags_architecture (0 à 5) : roman, gothique, renaissance, baroque, classique, art_deco, belle_epoque, medieval, colombages, pierres_blanches, pierres_dorees, brique, ardoise, granit, schiste, tuffeau, gres_rose, gres_rouge, basque, provencal, alsacien, breton, normand, savoyard, occitan, corse, catalan, flamand, fortifie, perche, troglodyte, bastide, castral, port_peche, station_balneaire, cite_thermale, cite_episcopale, cite_abbatiale, lavogne, calade

tags_cadre (1 à 3) : bord_de_mer, proche_mer, arriere_pays_cotier, haute_montagne, moyenne_montagne, colline, plaine, village_perche, falaise, gorges, riviere, lac, foret, vignoble, garrigue, ile

## STRUCTURE JSON ATTENDUE

{
  "departement": "${nomDepartement}",
  "code": "${code}",
  "tier": "${tier}",
  "specialites_culinaires": ["spécialité 1", "spécialité 2"],${hasPbvf ? `
  "patrimoine_pbvf": [
    { "nom": "NomPBVF", "score_esthetique": 9, "score_notoriete": 5, "tags_architecture": ["tag1"], "tags_cadre": ["village_perche"], "description_courte": "1-2 phrases.", "activites_notables": ["..."] }
  ],` : ""}
  "patrimoine": [
    {
      "nom": "Nom officiel",
      "nom_geocodage": "Pour sites isolés : 'Nom, Commune'. null pour communes.",
      "type_precis": "Ex: Cité médiévale",
      "tags_architecture": ["tag1", "tag2"],
      "tags_cadre": ["bord_de_mer", "village_perche"],
      "score_esthetique": 8,
      "score_notoriete": 4,
      "plus_beaux_villages": false,
      "description_courte": "1-2 phrases.",
      "activites_notables": ["Monument X", "Marché samedi"]
    }
  ],
  "plages": ${nbPlages > 0 ? `[
    { "nom": "...", "nom_geocodage": "Plage, Commune", "commune": "...", "type_plage": "grande_plage | crique | calanque | plage_lac | estuaire", "surf": false, "naturiste": false, "familiale": true, "justification": "1-2 phrases." }
  ]` : "[]"},
  "synthese_departement": "3-5 phrases."
}

## RAPPEL
- **patrimoine : exactement ${complement} entrées${hasPbvf ? " (HORS PBVF)" : ""}.**
- **score_esthetique** : barème strict (Arles, Les Baux = 10).
- **score_notoriete** : inconnu = 9 ou 10, carte postale = 1 ou 2.
${sectionPlages}

Département à analyser : ${nomDepartement} (${code}). Réponds UNIQUEMENT par le JSON ci-dessus.`;
}

function buildSectionPlages(nbPlages: number, cotier: ContexteDepartement["cotier"]): string {
  if (nbPlages <= 0) return "";

  const lines: string[] = [
    "",
    "### plages : " + nbPlages + " entrées. type_plage parmi : grande_plage, crique, calanque, plage_lac, estuaire. surf, naturiste, familiale en true/false. justification = 1-2 phrases.",
    "**RÈGLE ABSOLUE : toutes les plages doivent être STRICTEMENT DANS le département traité.** Ne JAMAIS inclure de plage d'un département voisin, même si elle est célèbre. Exemple : si tu traites le 06, N'INCLUS PAS Cassis (13), Ramatuelle (83), etc.",
  ];

  if (cotier) {
    if (cotier.facade) lines.push("Littoral " + cotier.facade + ".");
    if (cotier.criques) lines.push("Des criques sont attendues.");
    if (cotier.surf) lines.push("Spots surf possibles : indique surf: true.");
  }

  return lines.join(" ");
}
