/**
 * Adaptations des textes ville (fiches générées par ChatGPT).
 *
 * Le code fait exactement 3 types de remplacements, dans cet ordre :
 * 1. Accolades {forme_tu,forme_vous} → seul = tu (index 0), accompagné = vous (index 1)
 * 2. Crochets [masc,fem] ou [m,f,m_pl,f_pl] → genre (+ nombre)
 * 3. Placeholders MAJUSCULES [PRENOM], [PARTENAIRE], etc.
 *
 * Aucune autre transformation.
 */

export type Genre = "homme" | "femme";
export type TypePartenaire = "couple" | "famille" | "amis" | "seul";

export interface Personne {
  prenom: string;
  genre: Genre;
}

export interface ProfilVille {
  genre: Genre;
  typePartenaire: TypePartenaire;
  prenom?: string;
  /** true = accords au pluriel (groupes amis/famille) */
  pluriel?: boolean;
  nbEnfants?: number;
  partenaire?: Personne;
  enfants?: string[];
  amis?: string[];
}

// ---------------------------------------------------------------------------
// 1. Accolades {forme_tu,forme_vous} — seul vs accompagné
// ---------------------------------------------------------------------------

function replaceCurlyLists(text: string, p: ProfilVille): string {
  const isGroup = p.typePartenaire !== "seul";
  // Boucle pour traiter les accolades imbriquées (inner d'abord)
  let prev = "";
  let out = text;
  while (out !== prev) {
    prev = out;
    out = out.replace(/\{([^{}]+)\}/g, (match, inner: string) => {
      const parts = inner.split(",").map((s) => s.trim());
      if (parts.length !== 2) return match;
      return isGroup ? parts[1] : parts[0];
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Crochets [masc,fem] ou [m,f,m_pl,f_pl]
// ---------------------------------------------------------------------------

function getAccordIndex(genre: Genre, pluriel: boolean): number {
  const femme = genre === "femme";
  if (!pluriel) return femme ? 1 : 0;
  return femme ? 3 : 2;
}

function replaceSquareLists(text: string, p: ProfilVille): string {
  return text.replace(/\[([^\[\]]+)\]/g, (match, inner: string) => {
    if (/^[A-Z_]+$/.test(inner)) return match;

    const parts = inner.split(",").map((s) => s.trim());
    if (parts.length !== 2 && parts.length !== 4) return match;
    if (parts.some((x) => x.length === 0 || /\s/.test(x))) return match;

    if (parts.length === 2) {
      return p.genre === "femme" ? parts[1] : parts[0];
    }

    const idx = getAccordIndex(p.genre, p.pluriel === true);
    return parts[idx];
  });
}

// ---------------------------------------------------------------------------
// 3. Placeholders MAJUSCULES
// ---------------------------------------------------------------------------

function listeNaturelle(noms: string[]): string {
  if (noms.length === 0) return "";
  if (noms.length === 1) return noms[0];
  return noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1];
}

function getPlaceholderValues(p: ProfilVille): Record<string, string> {
  const femme = p.genre === "femme";
  const isGroupe = p.typePartenaire !== "seul";
  const poss = isGroupe ? { enfant: "votre enfant", enfants: "vos enfants", amis: "vos amis" } : { enfant: "ton enfant", enfants: "tes enfants", amis: "tes amis" };

  const partenaireCouple = p.partenaire
    ? p.partenaire.prenom
    : femme ? "ton copain" : "ta copine";

  const partenaire = p.partenaire?.prenom ?? partenaireCouple;

  let famille = poss.enfants;
  if (p.nbEnfants != null && p.nbEnfants > 0) {
    famille = p.nbEnfants === 1 ? poss.enfant : `${isGroupe ? "vos" : "tes"} ${p.nbEnfants} enfants`;
  }
  const partenaireFamille = p.partenaire?.prenom ?? famille;

  const listeAmis = p.amis && p.amis.length > 0
    ? listeNaturelle(p.amis)
    : poss.amis;

  const enfantsSujet = p.enfants && p.enfants.length > 0
    ? listeNaturelle(p.enfants)
    : p.nbEnfants === 1 ? poss.enfant : poss.enfants;

  const prenom = p.prenom ?? "toi";

  return {
    "[PRENOM]": prenom,
    "[Prenom]": prenom, // fallback si le modèle sort [Prenom] au lieu de [PRENOM]
    "[PARTENAIRE]": partenaire,
    "[PARTENAIRE_COUPLE]": partenaireCouple,
    "[PARTENAIRE_FAMILLE]": partenaireFamille,
    "[PARTENAIRE_AMIS]": listeAmis,
    "[LISTE_AMIS]": listeAmis,
    "[ENFANTS_SUJET]": enfantsSujet,
  };
}

function replacePlaceholders(text: string, p: ProfilVille): string {
  const values = getPlaceholderValues(p);
  let out = text;
  for (const [placeholder, value] of Object.entries(values)) {
    out = out.split(placeholder).join(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** Corrections de typos fréquentes du modèle */
const TYPO_FIXES: [RegExp, string][] = [
  [/résservez/g, "réservez"],
  [/\bGoutez\b/g, "Goûtez"],
];

function fixTypos(text: string): string {
  let out = text;
  for (const [re, replacement] of TYPO_FIXES) {
    out = out.replace(re, replacement);
  }
  return out;
}

export function adaptText(content: string, profile: ProfilVille): string {
  if (!content || !content.trim()) return content;

  let text = replaceCurlyLists(content, profile);
  text = replaceSquareLists(text, profile);
  text = replacePlaceholders(text, profile);
  text = fixTypos(text);

  return text;
}

export function adaptSections(
  sections: Record<string, string>,
  profile: ProfilVille,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, content] of Object.entries(sections)) {
    out[id] = adaptText(content, profile);
  }
  return out;
}

const DELIMITER_REGEX = /---([A-Z_]+)---/g;

export function parseRawSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = raw.split(DELIMITER_REGEX);
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const content = (parts[i + 1] ?? "").trim();
    if (id) sections[id] = content;
  }
  return sections;
}

export function parseAndAdaptRawResponse(
  rawApiResponse: string,
  profile: ProfilVille,
): Record<string, string> {
  const sections = parseRawSections(rawApiResponse);
  return adaptSections(sections, profile);
}
