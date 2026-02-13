/**
 * PROMPTS PAGE VILLE – Van-Life Journal
 *
 * Ton : s'adresser au lecteur avec "vous" (vous serez, vous trouverez...).
 * Longueur adaptée au niveau (1 = très court, 4 = plus long si justifié).
 */

export const OPENAI_MODEL = "gpt-4o-mini";

/** Règle de longueur injectée dans chaque prompt (résumé) */
const REGLE_LONGUEUR = `
Longueur selon le niveau : Niveau 1 = 50-120 mots max (si rien à dire : 1-2 phrases). Niveau 2 = 80-180 mots. Niveau 3 = 150-300 mots. Niveau 4 = 200-400 mots. N'invente jamais : si pas de contenu réel, dis-le en 1-2 phrases.`;

/** Prompt système : tutoiement/vouvoiement "vous", conseils au lecteur, précis, pas d'invention */
export const SYSTEM_PROMPT = `Tu es un couple de voyageurs expérimentés qui a roulé sa bosse et qui partage ses conseils sur le "Van-Life Journal". Tu t'adresses au lecteur avec "vous" (vous serez, vous trouverez, vous pourrez...). Tu es précis et sérieux sur les faits (chiffres, adresses, tarifs), mais ton style reste chaleureux, personnel, avec une pointe d'humour quand il n'y a rien à dire. Tu n'inventes jamais : si une ville n'a pas d'histoire, pas d'anecdote ou pas de resto, tu le dis clairement et brièvement. Tu écris en Markdown (listes, gras) pour structurer. Pas de phrases creuses ni de remplissage.`;

/** Diagnostic : évalue le lieu (1–4). Réponds UNIQUEMENT par un chiffre : 1, 2, 3 ou 4. */
export const DIAGNOSTIC_PROMPT = `Évalue le "Potentiel Narratif" du lieu suivant. Réponds UNIQUEMENT par un chiffre (1, 2, 3 ou 4), rien d'autre.

Échelle :
- 1 (Le Désert) : Hameau, lieu-dit, ville dortoir récente, zone industrielle.
- 2 (L'Escale Sympa) : Petit bourg avec une église et une boulangerie, ou ville moyenne fonctionnelle.
- 3 (La Pépite) : Village classé, "Plus beau village de France", spot naturel culte.
- 4 (La Métropole/Historique) : Grande ville chargée d'histoire ou capitale régionale.

Lieu à évaluer : [VILLE]`;

/** Prompts par section – [VILLE] et [NIVEAU] seront remplacés à l'exécution */
export const SECTION_PROMPTS = {
  en_quelques_mots: `[VILLE] en quelques mots. Niveau [NIVEAU].${REGLE_LONGUEUR}

Donne la description de base avec les fondamentaux :
- Nombre d'habitants (ordre de grandeur ou chiffre si connu).
- Touristique ou pas (oui / non / peu / très).
- Localisation et situation géographique : capitale de quelle région, placée où (fleuve, côte, montagne…), au milieu de quelle région.
- Ambiance en 2-3 phrases (ce que le lecteur ressent en arrivant).

Données factuelles uniquement. Pas d'invention. Niveau 1 : 3-5 phrases max.`,

  point_historique: `Le point historique pour [VILLE]. Niveau [NIVEAU].${REGLE_LONGUEUR}

Quelques dates clés uniquement :
- Fondation ou première mention connue (si elle existe).
- Deux événements marquants (vraiment liés à la ville ou à la région immédiate).
- Période d'apogée (si pertinent).

Dates et faits vérifiables. Aucune invention (pas de fausses batailles). Niveau 1-2 : si pas d'histoire propre, 1-2 phrases ("Peu d'histoire propre" ou "Histoire surtout régionale"). Niveau 3-4 : liste ou paragraphe court, pas de roman.`,

  bien_manger_boire: `Bien manger et bien boire à [VILLE]. Niveau [NIVEAU].${REGLE_LONGUEUR}

1. Commence par un petit paragraphe sur la spécialité locale (plat, produit) — si elle existe ; sinon une phrase.
2. Quatre catégories : Brunch/Café ; Dîner charme ; Verre/Apéro ; Nuit (bar, sortie).
3. Pour chaque adresse (si elle existe) : nom du lieu, adresse exacte (rue, numéro, code postal, ville), idée de prix en symboles € (€, €€ ou €€€), note TripAdvisor si tu la connais (sinon ne pas inventer), une phrase sur l'ambiance ou ce qu'on y commande. Formule au "vous" (vous y goûterez, vous pourrez...).

Niveau 1 : si aucun commerce, dis-le clairement ("Pas de resto/bar sur place ; prévoir frigo ou étape à X km"). Adresses réelles uniquement.`,

  arriver_van: `Arriver en van à [VILLE]. Niveau [NIVEAU].${REGLE_LONGUEUR}

- Au moins deux parkings si la ville en a : adresse exacte, tarifs exacts (ou fourchette), localisation précise (centre, périphérie).
- Où aller à proximité si vous êtes en village (autre village, ville proche).
- Possibilité de se garer gratuitement (où, conditions).
- Si le lieu est en campagne ou au milieu de nulle part : renvoie vers Park4Night au lieu d'inventer. Indique : "Pour les spots bivouac et parkings en campagne, voir Park4Night" (lien https://park4night.com si pertinent).
- ZFE, barres de hauteur, vols : mentionne uniquement si c'est le cas.

Adresses et tarifs réels. Pas d'invention.`,

  que_faire: `Que faire à [VILLE]. Niveau [NIVEAU].${REGLE_LONGUEUR}

Rédige en t'adressant au lecteur avec "vous" : activités, visites, sorties que vous lui recommandez (vous pourrez..., vous serez..., nous avons testé pour vous...). Sois concret : lieux, horaires utiles si pertinent, ce qui vaut le coup ou pas.

Si la ville n'a rien de notable à faire, dis-le en 1-2 phrases. N'invente pas d'attractions.`,

  anecdote: `Anecdote sur [VILLE]. Niveau [NIVEAU].${REGLE_LONGUEUR}

Si la ville a une anecdote, un fait insolite ou une légende connue (vérifiable) : raconte-la en quelques phrases, court et percutant.
Si rien de fiable ou d'intéressant : dis explicitement qu'il n'y a pas d'anecdote particulière, en 1 phrase. Ne pas inventer.`,
} as const;

export type SectionType = keyof typeof SECTION_PROMPTS;
