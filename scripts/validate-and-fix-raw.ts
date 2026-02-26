/**
 * Valide et corrige une fiche ville brute (raw) issue de l'API.
 *
 * 1. Corrections automatiques déterministes (accolades identiques, casse…)
 * 2. Détection d'erreurs qui nécessitent un renvoi ciblé à l'IA
 * 3. Renvoi des sections fautives à OpenAI pour correction
 * 4. Écriture du fichier corrigé (<slug>-raw-fixed.txt)
 *
 * Usage: npx tsx scripts/validate-and-fix-raw.ts <fichier-raw.txt> [modele]
 * Ex:    npx tsx scripts/validate-and-fix-raw.ts data/test-adaptation/marseille-raw.txt
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { parseRawSections } from "../lib/ville-adaptation";

// ─── Config ──────────────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const SECTION_ORDER = [
  "PRESENTATION",
  // Top 100
  "HISTOIRE_BASES",
  "HISTOIRE_APPROFONDI",
  "QUE_FAIRE_CONNU",
  "QUE_FAIRE_INCONNU",
  "MANGER_INTIME_SERRE",
  "MANGER_INTIME_LARGE",
  "MANGER_ANIME_SERRE",
  "MANGER_ANIME_LARGE",
  // Familles allégées
  "HISTOIRE",
  "QUE_FAIRE",
  "QUE_VOIR",
  "PARCOURS",
  "MANGER",
  // Bonus (communs)
  "BONUS_COUPLE",
  "BONUS_SEUL",
  "BONUS_FAMILLE",
  "BONUS_AMIS",
  // Tags techniques
  "PHOTOS",
  "VAN",
  "DUREE",
];

const HISTOIRE_SECTIONS = ["HISTOIRE_BASES", "HISTOIRE_APPROFONDI", "HISTOIRE"];
const BONUS_VOUS_SECTIONS = ["BONUS_COUPLE", "BONUS_FAMILLE", "BONUS_AMIS"];

const CLICHES_INTERDITS = [
  "à couper le souffle",
  "joyau",
  "petit coin de paradis",
  "dolce vita",
  "chef-d'œuvre architectural",
  "incontournable",
  "ne pas manquer",
  "plongée fascinante",
  "dîner aux chandelles",
  "brise marine emporter vos soucis",
  "melting-pot culturel",
  "main dans la main",
  "suspendre le temps",
  "prolonger la nuit",
  "n'attend que votre énergie",
  "loin du tumulte",
  "valeur sûre",
];

const PRENOM_LIMITS: Record<string, number> = {
  PRESENTATION: 1,
  HISTOIRE_BASES: 0,
  HISTOIRE_APPROFONDI: 0,
  HISTOIRE: 0,
  QUE_FAIRE_CONNU: 1,
  QUE_FAIRE_INCONNU: 1,
  QUE_FAIRE: 1,
  QUE_VOIR: 1,
  PARCOURS: 1,
  MANGER_INTIME_SERRE: 0,
  MANGER_INTIME_LARGE: 0,
  MANGER_ANIME_SERRE: 0,
  MANGER_ANIME_LARGE: 0,
  MANGER: 0,
  BONUS_COUPLE: 1,
  BONUS_SEUL: 1,
  BONUS_FAMILLE: 1,
  BONUS_AMIS: 1,
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Issue {
  section: string;
  type: "autofix" | "warning" | "ai_fix";
  message: string;
}

// ─── 1. Corrections automatiques ─────────────────────────────────────────────

function autoFixSection(sectionId: string, text: string): { text: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = text;

  // 1-espace. Espaces autour de la virgule dans accolades : {tu, vous} → {tu,vous}
  out = out.replace(/\{([^{}]+),\s+([^{}]+)\}/g, (match, a: string, b: string) => {
    const trimA = a.trim();
    const trimB = b.trim();
    const fixed = `{${trimA},${trimB}}`;
    if (fixed !== match) {
      fixes.push(`Espace supprimé dans accolades : ${match} → ${fixed}`);
    }
    return fixed;
  });

  // 1-pre. Crochets identiques connus : [Chère,Chère] → [Cher,Chère]
  out = out.replace(/\[Chère,Chère\]/g, () => {
    fixes.push("Crochets corrigés : [Chère,Chère] → [Cher,Chère]");
    return "[Cher,Chère]";
  });
  // Tout autre crochet identique [X,X] → X (mot invariable)
  out = out.replace(/\[([a-zàâäéèêëïîôùûüÿç]+),\1\]/gi, (_match, word: string) => {
    // Ne pas toucher aux placeholders MAJUSCULES
    if (/^[A-Z_]+$/.test(word)) return _match;
    fixes.push(`Crochets identiques retirés : [${word},${word}] → ${word}`);
    return word;
  });

  // 1a. Accolades identiques {X,X} → X (seulement si c'est un infinitif ou invariable)
  // Les verbes conjugués (-ez, -ons, -es, -ent) avec formes identiques = erreur de l'IA, pas un auto-fix
  out = out.replace(/\{([^{},]+),\1\}/g, (match, word: string) => {
    const lastWord = word.trim().split(/\s+/).pop() ?? "";
    const isConjugated = /(?:ez|ons|ent|es|as|ais|ait|aient|ions|iez)$/i.test(lastWord);
    if (isConjugated) {
      // Ne PAS auto-corriger : sera traité en détection (2l) puis renvoyé à l'IA
      return match;
    }
    fixes.push(`Accolades identiques retirées : {${word},${word}} → ${word}`);
    return word;
  });

  // 1b. Accent manquant sur féminin dans crochets : [légers,légeres] → [légers,légères]
  out = out.replace(/\[([a-zàâäéèêëïîôùûüÿç]+),([a-zàâäéèêëïîôùûüÿç]+)\]/gi, (match, masc: string, fem: string) => {
    let fixedFem = fem;
    // -er(s) → -ère(s)
    if (/ers?$/i.test(masc) && /eres?$/i.test(fem) && !/[èê]res?$/i.test(fem)) {
      fixedFem = fem.replace(/ere(s?)$/i, "ère$1");
    }
    // -et(s) → -ète(s)
    if (/ets?$/i.test(masc) && /etes?$/i.test(fem) && !/[èê]tes?$/i.test(fem)) {
      fixedFem = fem.replace(/ete(s?)$/i, "ète$1");
    }
    if (fixedFem !== fem) {
      fixes.push(`Accent féminin corrigé : [${masc},${fem}] → [${masc},${fixedFem}]`);
      return `[${masc},${fixedFem}]`;
    }
    return match;
  });

  // 1d. Format restaurant : "• Chez Etienne" → "• Nom : Chez Etienne" (MANGER uniquement)
  if (sectionId.startsWith("MANGER")) {
    out = out.replace(/^• (?!Nom\s*:)(.+)$/gm, (match, nom: string) => {
      // Ne corriger que les lignes qui ressemblent à un nom de restaurant (pas Adresse, Cuisine, etc.)
      if (/^(Adresse|Cuisine|Ambiance|Prix|Note)\s*:/i.test(nom)) return match;
      fixes.push(`Format restaurant corrigé : • ${nom} → • Nom : ${nom}`);
      return `• Nom : ${nom}`;
    });
  }

  // 1c. Casse incohérente entre les deux formes d'une accolade
  out = out.replace(/\{([^{},]+),([^{}]+)\}/g, (match, tu: string, vous: string) => {
    let tuF = tu, vousF = vous;
    // {minuscule,Majuscule} → capitaliser tu
    if (/^[a-zàâäéèêëïîôùûüÿç]/.test(tu) && /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/.test(vous)) {
      tuF = tu.charAt(0).toUpperCase() + tu.slice(1);
    }
    // {Majuscule,minuscule} → capitaliser vous
    if (/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/.test(tu) && /^[a-zàâäéèêëïîôùûüÿç]/.test(vous)) {
      vousF = vous.charAt(0).toUpperCase() + vous.slice(1);
    }
    if (tuF !== tu || vousF !== vous) {
      fixes.push(`Casse corrigée : {${tu},${vous}} → {${tuF},${vousF}}`);
      return `{${tuF},${vousF}}`;
    }
    return match;
  });

  return { text: out, fixes };
}

// ─── 2. Détection des problèmes ─────────────────────────────────────────────

function detectIssues(sectionId: string, text: string): Issue[] {
  const issues: Issue[] = [];

  // 2a. HISTOIRE : aucune accolade, aucun crochet non-placeholder, aucun pronom 2e personne
  if (HISTOIRE_SECTIONS.includes(sectionId)) {
    if (/\{[^}]+\}/.test(text)) {
      issues.push({ section: sectionId, type: "ai_fix", message: "Accolades {…} trouvées dans une section HISTOIRE (interdit)." });
    }
    const hasNonPlaceholderBrackets = text.match(/\[([^\]]+)\]/g)?.some((m) => !/^\[[A-Z_]+\]$/.test(m));
    if (hasNonPlaceholderBrackets) {
      issues.push({ section: sectionId, type: "ai_fix", message: "Crochets [masc,fem] trouvés dans une section HISTOIRE (interdit)." });
    }
    // Pronoms 2e personne : mots exacts uniquement (éviter les faux positifs sur "tandis", "toujours", etc.)
    const pronoms2e = text.match(/(?:^|[\s,;:.'""«»()\-–—])(?:tu|vous|ton|ta|tes|toi|votre|vos)(?=[\s,;:.'""«»()\-–—!?]|$)/gim);
    if (pronoms2e && pronoms2e.length > 0) {
      const found = pronoms2e.map((p) => p.trim()).join(", ");
      issues.push({ section: sectionId, type: "ai_fix", message: `Pronom(s) de 2e personne trouvé(s) dans HISTOIRE : ${found}.` });
    }
  }

  // 2a-bis. BONUS : aucune accolade autorisée
  if (sectionId.startsWith("BONUS_")) {
    const accolades = text.match(/\{[^}]*\}/g);
    if (accolades && accolades.length > 0) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Accolades trouvées dans un BONUS (interdit) : ${accolades.join(", ")}. BONUS_SEUL = tout en « tu », BONUS_COUPLE/FAMILLE/AMIS = tout en « vous », sans accolades.`,
      });
    }
  }

  // 2a-ter. Crochets avec formes identiques [X,X] (mot invariable ou erreur)
  const identicalBrackets = text.matchAll(/\[([a-zàâäéèêëïîôùûüÿç]+),([a-zàâäéèêëïîôùûüÿç]+)\]/gi);
  for (const ib of identicalBrackets) {
    if (ib[1] === ib[2]) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Crochets avec formes identiques [${ib[1]},${ib[2]}] — mot invariable, retirer les crochets.`,
      });
    }
  }

  // 2b. Pronom réfléchi orphelin après accolade fermante
  // Gère les apostrophes ASCII (') et typographiques (')
  const apos = `[''\u2019]`;
  const reflexifOrphelinRegex = new RegExp(`\\}\\s*t${apos}`, "i");
  const teOrphelinRegex = new RegExp(`\\}\\s*te\\b`, "i");
  if (reflexifOrphelinRegex.test(text) || teOrphelinRegex.test(text)) {
    issues.push({
      section: sectionId,
      type: "ai_fix",
      message: "Pronom réfléchi t'/te après une accolade : ne s'adapte pas au vous. Intégrer le réfléchi dans l'accolade ou reformuler.",
    });
  }

  // 2c. Clichés interdits
  const lower = text.toLowerCase();
  for (const cliche of CLICHES_INTERDITS) {
    if (lower.includes(cliche.toLowerCase())) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Cliché interdit trouvé : « ${cliche} ».`,
      });
    }
  }

  // 2d. [PRENOM] fréquence
  const prenomCount = (text.match(/\[PRENOM\]/g) || []).length;
  const limit = PRENOM_LIMITS[sectionId];
  if (limit !== undefined) {
    if (sectionId === "PRESENTATION" && prenomCount !== 1) {
      issues.push({ section: sectionId, type: "ai_fix", message: `[PRENOM] apparaît ${prenomCount}× (attendu : exactement 1).` });
    } else if (limit === 0 && prenomCount > 0) {
      issues.push({ section: sectionId, type: "ai_fix", message: `[PRENOM] apparaît ${prenomCount}× (attendu : 0).` });
    } else if (limit > 0 && sectionId !== "PRESENTATION" && prenomCount > limit) {
      issues.push({ section: sectionId, type: "warning", message: `[PRENOM] apparaît ${prenomCount}× (max recommandé : ${limit}).` });
    }
  }

  // 2e. BONUS en « vous » avec possessifs « tu »
  if (BONUS_VOUS_SECTIONS.includes(sectionId)) {
    const tuPossessifs = text.match(/\b(ton |ta |tes |toi[ ,.])/gi);
    if (tuPossessifs && tuPossessifs.length > 0) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Possessif(s) « tu » dans un BONUS en « vous » : ${tuPossessifs.map(s => s.trim()).join(", ")}. Utiliser vos/votre/vous.`,
      });
    }
  }

  // 2f. Double « et » consécutif (probable après expansion de [ENFANTS_SUJET] ou [LISTE_AMIS])
  if (/\bet\s+\[ENFANTS_SUJET\]/.test(text) || /\bet\s+\[LISTE_AMIS\]/.test(text)) {
    issues.push({
      section: sectionId,
      type: "ai_fix",
      message: "Risque de double « et » après expansion du placeholder. Utiliser une virgule avant le placeholder.",
    });
  }

  // 2g. Formes identiques après normalisation dans crochets genrés (accents auto-corrigés en amont)
  const bracketPairs = text.matchAll(/\[([a-zàâäéèêëïîôùûüÿç]+),([a-zàâäéèêëïîôùûüÿç]+)\]/gi);
  for (const bp of bracketPairs) {
    const [full, masc, fem] = bp;
    const mascNorm = masc.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const femNorm = fem.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (mascNorm === femNorm && masc !== fem) {
      issues.push({
        section: sectionId,
        type: "warning",
        message: `Formes identiques après normalisation dans ${full} — possible erreur d'accent.`,
      });
    }
  }

  // 2h. Deux accords genrés [masc,fem] dans la même phrase
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    const brackets = sentence.match(/\[[a-zàâäéèêëïîôùûüÿç]+,[a-zàâäéèêëïîôùûüÿç]+\]/gi) || [];
    if (brackets.length > 1) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Plusieurs accords genrés dans la même phrase (${brackets.join(" et ")}). Max 1 par phrase.`,
      });
    }
  }

  // 2i. BONUS_COUPLE : [PARTENAIRE] manquant
  if (sectionId === "BONUS_COUPLE" && !text.includes("[PARTENAIRE]")) {
    issues.push({ section: sectionId, type: "ai_fix", message: "[PARTENAIRE] absent du BONUS_COUPLE (obligatoire en 1ère phrase)." });
  }

  // 2j. BONUS_FAMILLE : [ENFANTS_SUJET] manquant
  if (sectionId === "BONUS_FAMILLE" && !text.includes("[ENFANTS_SUJET]")) {
    issues.push({ section: sectionId, type: "ai_fix", message: "[ENFANTS_SUJET] absent du BONUS_FAMILLE (obligatoire en 1ère phrase)." });
  }

  // 2k. BONUS_AMIS : [LISTE_AMIS] manquant
  if (sectionId === "BONUS_AMIS" && !text.includes("[LISTE_AMIS]")) {
    issues.push({ section: sectionId, type: "ai_fix", message: "[LISTE_AMIS] absent du BONUS_AMIS (obligatoire en 1ère phrase)." });
  }

  // 2l. Accolades identiques sur verbe conjugué : l'IA a écrit {misez,misez} au lieu de {mise,misez}
  const identicalConjugated = text.matchAll(/\{([^{},]+),\1\}/g);
  for (const m of identicalConjugated) {
    const word = m[1].trim();
    const lastWord = word.split(/\s+/).pop() ?? "";
    const isConjugated = /(?:ez|ons|ent|es|as|ais|ait|aient|ions|iez)$/i.test(lastWord);
    if (isConjugated) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Accolades identiques sur verbe conjugué : {${word},${word}}. La forme « tu » est probablement différente — réécrire avec les deux formes correctes.`,
      });
    }
  }

  // 2n. Forme « tu » qui finit en -ez/-ons (conjugaison « vous » dans le slot « tu »)
  const allBraces = text.matchAll(/\{([^{},]+),([^{}]+)\}/g);
  for (const br of allBraces) {
    const tuForm = br[1].trim();
    const vousForm = br[2].trim();
    if (tuForm === vousForm) continue;
    const lastTu = tuForm.split(/\s+/).pop() ?? "";
    if (/ez$/i.test(lastTu)) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Forme « tu » terminant en -ez (forme « vous ») : {${tuForm},${vousForm}}. Corriger avec la vraie forme « tu ».`,
      });
    }
  }

  // 2o. Accolade avec juste un pronom sans verbe : {tu, vous} ou {tu,vous} isolé
  const pronounOnlyBraces = text.matchAll(/\{(tu|toi)\s*,\s*(vous)\}/gi);
  for (const po of pronounOnlyBraces) {
    issues.push({
      section: sectionId,
      type: "ai_fix",
      message: `Accolade ne contenant qu'un pronom : {${po[1]},${po[2]}}. Le verbe doit être DANS l'accolade : {tu aimes,vous aimez}.`,
    });
  }

  // 2p. Infinitif inchangé avec pronom « vous » ajouté : {lâcher,vous lâcher}
  const infBraces = text.matchAll(/\{([^{},]+),\s*vous\s+(\S[^{}]*)\}/g);
  for (const ib of infBraces) {
    const tuForm = ib[1].trim();
    const afterVous = ib[2].trim();
    // Si la partie après « vous » est identique à la forme tu, c'est un infinitif avec pronom ajouté
    if (afterVous === tuForm && /(?:er|ir|re|oir)$/i.test(tuForm)) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Infinitif inchangé avec « vous » ajouté : {${tuForm},vous ${afterVous}}. Un infinitif identique ne prend pas d'accolades — écrire directement « ${tuForm} ».`,
      });
    }
  }

  // 2q. Accord genré collé au mot : seul[masc,fem], curieux[s,es], émerveillé[s,es]
  // Pattern 1 : mot[masc,fem] littéral
  const literalMascFem = text.matchAll(/([a-zàâäéèêëïîôùûüÿç]+)\[masc,fem\]/gi);
  for (const lm of literalMascFem) {
    issues.push({
      section: sectionId,
      type: "ai_fix",
      message: `Accord genré collé au mot sans formes explicites : ${lm[0]}. Écrire les deux formes complètes, ex. [${lm[1]},${lm[1]}e] ou l'équivalent correct.`,
    });
  }
  // Pattern 2 : mot[suffix_court,suffix_court] (suffixes ≤ 3 car)
  const suffixBrackets = text.matchAll(/([a-zàâäéèêëïîôùûüÿç]{2,})\[([a-zàâäéèêëïîôùûüÿç]{1,3}),([a-zàâäéèêëïîôùûüÿç]{1,3})\]/gi);
  for (const sb of suffixBrackets) {
    const word = sb[1], suffM = sb[2], suffF = sb[3];
    if (suffM === "masc" || suffF === "fem") continue;
    issues.push({
      section: sectionId,
      type: "ai_fix",
      message: `Suffixe genré collé au mot : ${sb[0]}. Écrire les deux formes complètes entre crochets, ex. [${word}${suffM},${word}${suffF}] (vérifier l'orthographe).`,
    });
  }

  // 2r. Accolades imbriquées : {tu {débouches,débouchez}} ou {X,{Y,Z}}
  const nestedBraces = text.match(/\{[^{}]*\{[^}]*\}[^}]*\}/g);
  if (nestedBraces) {
    for (const nb of nestedBraces) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `Accolades imbriquées détectées : ${nb}. Aplatir en une seule paire {forme_tu,forme_vous}.`,
      });
    }
  }

  // 2m. MANGER : entrée qui n'est pas un vrai restaurant (marché, stand, food truck…)
  if (sectionId.startsWith("MANGER")) {
    // Accepter les deux formats : "• Nom : X" ou "• X"
    const nomEntries = text.match(/•\s*(?:Nom\s*:\s*)?(.+)/g) || [];
    for (const entry of nomEntries) {
      const nom = entry.replace(/•\s*(?:Nom\s*:\s*)?/, "").trim();
      if (/\b(march[eé]|stand|food\s*truck|kiosque|snack(?:ing)?|boulangerie|épicerie|halles?)\b/i.test(nom) ||
          /\(/.test(nom)) {
        issues.push({
          section: sectionId,
          type: "ai_fix",
          message: `« ${nom} » ne semble pas être un vrai restaurant (marché, stand, parenthèse…). Remplacer par un restaurant réel avec adresse vérifiable.`,
        });
      }
    }
    // (Format restaurant corrigé en auto-fix 1d)

    // 2m-bis. MANGER : l'accroche doit contenir au moins 1 accolade
    const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("•") && !l.startsWith("Adresse") && !l.startsWith("Cuisine") && !l.startsWith("Ambiance") && !l.startsWith("Prix") && !l.startsWith("Note"));
    const accrocheLines = lines.filter((l) => !l.startsWith("---"));
    for (const al of accrocheLines) {
      if (al.trim() && !/\{[^}]+\}/.test(al)) {
        issues.push({
          section: sectionId,
          type: "ai_fix",
          message: `Phrase d'accroche sans accolades : « ${al.trim().slice(0, 60)}… ». L'accroche MANGER doit contenir au moins un verbe en {tu,vous}.`,
        });
        break;
      }
    }

    // 2m-ter. MANGER_*_LARGE devrait avoir au moins un restaurant €€€
    const prixMatches = text.match(/Prix\s*:\s*(€{1,3})/g) || [];
    const prixList = prixMatches.map((p) => p.replace(/Prix\s*:\s*/, "").trim());
    if (sectionId.includes("_LARGE") && prixList.length >= 2 && !prixList.some((p) => p === "€€€")) {
      issues.push({
        section: sectionId,
        type: "ai_fix",
        message: `MANGER_LARGE sans aucun restaurant €€€ (tous ${prixList.join("/")}). Remplacer un des deux par un €€€.`,
      });
    }
  }

  return issues;
}

// ─── 2-bis. Détection inter-sections (recyclage BONUS / QUE_FAIRE) ───────────

function detectRecycledLieux(sections: Record<string, string>, villeName?: string): Issue[] {
  const issues: Issue[] = [];

  const queFaireSections = ["QUE_FAIRE_CONNU", "QUE_FAIRE_INCONNU", "QUE_FAIRE", "QUE_VOIR", "PARCOURS"];
  const lieuxQueFaire = new Set<string>();
  for (const id of queFaireSections) {
    if (!sections[id]) continue;
    const matches = sections[id].match(/[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç'-]{3,}/g) || [];
    const ignoreWords = new Set([
      // Impératifs
      "Commence", "Commencez", "Poursuis", "Poursuivez", "Grimpe", "Grimpez",
      "Monte", "Montez", "Entre", "Entrez", "Fais", "Faites", "Laisse", "Laissez",
      "Tente", "Tentez", "Perds", "Perdez", "Découvre", "Découvrez", "Ose", "Osez",
      "Cherche", "Cherchez", "File", "Filez", "Suis", "Suivez", "Prends", "Prenez",
      "Gagne", "Gagnez", "Accorde", "Accordez", "Embarque", "Embarquez",
      "Pousse", "Poussez", "Marche", "Marchez", "Installe", "Installez",
      "Traverse", "Traversez", "Teste", "Testez", "Profite", "Profitez",
      "Lance", "Lancez", "Trouve", "Trouvez", "Offre", "Offrez", "Réserve", "Réservez",
      "Échappe", "Échappez",
      // Mots grammaticaux
      "Enfin", "Aussi", "Ici", "Quand", "Dans", "Pour", "Avec", "Entre",
      "Même", "Après", "Ensuite", "Puis",
      // Parties de noms composés (pas des lieux autonomes)
      "Bonne", "Mère", "Vieux", "Vieille", "Grand", "Grande", "Petit", "Petite",
      "Saint", "Sainte", "Notre", "Dame", "Belle", "Garde", "Cours",
      // Géographie trop vague (routes, zones étendues)
      "Corniche", "Côte", "Plage", "Port", "Quai", "Jardin", "Jardins",
      "Parc", "Place", "Château", "Tour", "Abbaye",
      // Termes géographiques génériques
      "Méditerranée", "Atlantique", "France", "Europe", "Provence", "Bretagne",
      "Normandie", "Côte", "Nord", "Sud", "Est", "Ouest",
    ]);
    // Exclure le nom de la ville elle-même
    if (villeName) ignoreWords.add(villeName);
    for (const m of matches) {
      if (!ignoreWords.has(m)) {
        lieuxQueFaire.add(m);
      }
    }
  }

  // Vérifier que les BONUS n'utilisent pas les mêmes noms propres
  const bonusSections = ["BONUS_COUPLE", "BONUS_SEUL", "BONUS_FAMILLE", "BONUS_AMIS"];
  for (const id of bonusSections) {
    if (!sections[id]) continue;
    const matches = sections[id].match(/[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç'-]{3,}/g) || [];
    const recycled = matches.filter((m) => lieuxQueFaire.has(m) && m.length >= 5 && !/^[A-Z][a-z]+[-']$/.test(m));
    if (recycled.length > 0) {
      const unique = [...new Set(recycled)];
      issues.push({
        section: id,
        type: "warning",
        message: `Lieu(x) possiblement recyclé(s) depuis QUE_FAIRE : ${unique.join(", ")}. Vérifier que le BONUS propose un angle inédit.`,
      });
    }
  }

  return issues;
}

// ─── 3. Renvoi ciblé à l'IA ─────────────────────────────────────────────────

function buildFixPrompt(sectionId: string, sectionText: string, issues: Issue[]): string {
  const issueList = issues.map((i) => `- ${i.message}`).join("\n");

  return `Tu es un correcteur de fiches villes. La section suivante contient des erreurs de balisage ou de style.

ERREURS DÉTECTÉES :
${issueList}

SECTION ORIGINALE :
---${sectionId}---
${sectionText}

RÈGLES RAPPEL :
- Accolades {forme_tu,forme_vous} : uniquement quand le lecteur est le sujet. Les infinitifs identiques ne prennent PAS d'accolades.
- Pronoms réfléchis DANS les accolades : {Laisse-toi,Laissez-vous} ✓ / {Laisse,Laissez}-toi ✗. Après une accolade, pas de t'/te orphelin.
- Crochets [masc,fem] : max 1 par phrase. Les deux formes doivent être différentes.
- HISTOIRE : 0 accolade, 0 crochet, 0 pronom de 2e personne.
- BONUS_COUPLE/FAMILLE/AMIS : tout en « vous » y compris les possessifs (vos, votre). Pas de « ton/ta/tes ».
- Pas de virgule avant un placeholder qui contient déjà un « et » interne. Séparer par virgule : [PRENOM], [PARTENAIRE], [ENFANTS_SUJET], …
- Clichés interdits à remplacer par une formulation originale.
- Format restaurant strict : « • Nom : [nom exact] » (avec « Nom : » obligatoire).
- BONUS : lieu ou angle inédit, pas de recyclage depuis QUE_FAIRE. Proposer un lieu DIFFÉRENT si recyclage détecté.
- Restaurants étoilés Michelin interdits.
- BONUS : aucune accolade. BONUS_SEUL tout en « tu » direct, BONUS_COUPLE/FAMILLE/AMIS tout en « vous » direct.

IMPORTANT : NE MODIFIE QUE les erreurs listées ci-dessus. Conserve TOUTES les accolades {tu,vous} et crochets [masc,fem] existants à l'identique. Ne les supprime pas, ne les reformate pas.

Renvoie UNIQUEMENT la section corrigée, avec le même délimiteur ---${sectionId}--- au début. Conserve le ton, le contenu et la structure.`;
}

async function fixSectionWithAI(
  openai: OpenAI,
  model: string,
  sectionId: string,
  sectionText: string,
  issues: Issue[],
): Promise<string> {
  const prompt = buildFixPrompt(sectionId, sectionText, issues);

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const output = response.choices[0]?.message?.content ?? "";
  const tokens = response.usage;
  if (tokens) {
    console.log(`    Tokens correction — prompt: ${tokens.prompt_tokens}, completion: ${tokens.completion_tokens}`);
  }

  const delimiterRegex = new RegExp(`---${sectionId}---\\s*([\\s\\S]*)`, "m");
  const match = output.match(delimiterRegex);
  if (match) return match[1].trim();

  return output.trim();
}

// ─── 4. Reconstruction du fichier ────────────────────────────────────────────

function rebuildRaw(sections: Record<string, string>): string {
  const parts: string[] = [];
  for (const id of SECTION_ORDER) {
    if (sections[id] !== undefined) {
      parts.push(`---${id}---`);
      parts.push(sections[id]);
      parts.push("");
    }
  }
  return parts.join("\n").trimEnd();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvLocal();

  const inputPath = process.argv[2];
  const model = process.argv[3] ?? "gpt-4.1";

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/validate-and-fix-raw.ts <fichier-raw.txt> [modele]");
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf-8");
  const sections = parseRawSections(raw);

  // Extraire le nom de la ville depuis le nom du fichier (e.g. "marseille-raw.txt" → "Marseille")
  const fileSlug = inputPath.replace(/.*[/\\]/, "").replace(/-raw(-fixed)?\.txt$/, "");
  const villeName = fileSlug.charAt(0).toUpperCase() + fileSlug.slice(1);

  console.log("══════════════════════════════════════════════");
  console.log("  Validation de la fiche brute");
  console.log("══════════════════════════════════════════════\n");

  // Check missing sections (only report truly missing ones, not format variants)
  const presentSections = new Set(Object.keys(sections));
  const missingCritical: string[] = [];
  if (!presentSections.has("PRESENTATION")) missingCritical.push("PRESENTATION");
  if (!presentSections.has("BONUS_COUPLE")) missingCritical.push("BONUS_COUPLE");
  if (!presentSections.has("BONUS_SEUL")) missingCritical.push("BONUS_SEUL");
  if (!presentSections.has("BONUS_FAMILLE")) missingCritical.push("BONUS_FAMILLE");
  if (!presentSections.has("BONUS_AMIS")) missingCritical.push("BONUS_AMIS");
  if (missingCritical.length > 0) {
    console.log(`⚠  Sections manquantes : ${missingCritical.join(", ")}`);
  }
  console.log(`  Sections trouvées : ${[...presentSections].join(", ")}`);

  let totalAutoFixes = 0;
  const allWarnings: Issue[] = [];
  const sectionsToFix: Map<string, Issue[]> = new Map();

  for (const id of SECTION_ORDER) {
    if (!sections[id]) continue;

    // Auto-fix
    const { text: fixed, fixes } = autoFixSection(id, sections[id]);
    if (fixes.length > 0) {
      sections[id] = fixed;
      totalAutoFixes += fixes.length;
      for (const f of fixes) {
        console.log(`  ✓ AUTO [${id}] ${f}`);
      }
    }

    // Detect
    const issues = detectIssues(id, sections[id]);
    for (const issue of issues) {
      if (issue.type === "warning") {
        allWarnings.push(issue);
      } else if (issue.type === "ai_fix") {
        if (!sectionsToFix.has(id)) sectionsToFix.set(id, []);
        sectionsToFix.get(id)!.push(issue);
      }
    }
  }

  // Détection inter-sections : recyclage BONUS / QUE_FAIRE
  const recyclingIssues = detectRecycledLieux(sections, villeName);
  for (const issue of recyclingIssues) {
    if (issue.type === "warning") {
      allWarnings.push(issue);
    } else if (issue.type === "ai_fix") {
      if (!sectionsToFix.has(issue.section)) sectionsToFix.set(issue.section, []);
      sectionsToFix.get(issue.section)!.push(issue);
    }
  }

  console.log(`\n── Résumé ──`);
  console.log(`  Corrections auto : ${totalAutoFixes}`);
  console.log(`  Warnings         : ${allWarnings.length}`);
  console.log(`  Sections à renvoyer à l'IA : ${sectionsToFix.size}`);

  if (allWarnings.length > 0) {
    console.log(`\n── Warnings ──`);
    for (const w of allWarnings) {
      console.log(`  ⚠ [${w.section}] ${w.message}`);
    }
  }

  if (sectionsToFix.size > 0) {
    console.log(`\n── Erreurs à corriger via IA ──`);
    for (const [id, issues] of sectionsToFix) {
      for (const issue of issues) {
        console.log(`  ✗ [${id}] ${issue.message}`);
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("\n⚠ OPENAI_API_KEY manquante — corrections IA impossibles. Fichier sauvé avec corrections auto uniquement.");
    } else {
      const openai = new OpenAI({ apiKey });
      console.log(`\n── Correction IA (${model}) ──`);

      for (const [id, issues] of sectionsToFix) {
        console.log(`  → Correction de ${id}…`);
        try {
          const corrected = await fixSectionWithAI(openai, model, id, sections[id], issues);
          sections[id] = corrected;
          console.log(`  ✓ ${id} corrigé`);
        } catch (err: any) {
          console.error(`  ✗ Échec correction ${id}: ${err.message}`);
        }
      }
    }
  }

  // Post-correction : re-lancer l'auto-fix sur les sections corrigées par l'IA
  if (sectionsToFix.size > 0) {
    let postAutoFixes = 0;
    for (const id of sectionsToFix.keys()) {
      if (!sections[id]) continue;
      const { text: reFixed, fixes: reFixes } = autoFixSection(id, sections[id]);
      if (reFixes.length > 0) {
        sections[id] = reFixed;
        postAutoFixes += reFixes.length;
        for (const f of reFixes) {
          console.log(`  ✓ POST-AUTO [${id}] ${f}`);
        }
      }
    }
    if (postAutoFixes > 0) {
      console.log(`  → ${postAutoFixes} correction(s) post-IA appliquée(s)`);
    }
  }

  // Write output
  const outPath = inputPath.replace(/-raw\.txt$/, "-raw-fixed.txt");
  const output = rebuildRaw(sections);
  writeFileSync(outPath, output, "utf-8");
  console.log(`\n✓ Fichier corrigé : ${outPath}`);

  // Re-validate to show remaining issues
  const fixedSections = parseRawSections(readFileSync(outPath, "utf-8"));
  let remainingIssues = 0;
  for (const id of SECTION_ORDER) {
    if (!fixedSections[id]) continue;
    const issues = detectIssues(id, fixedSections[id]);
    const real = issues.filter((i) => i.type === "ai_fix");
    remainingIssues += real.length;
    for (const issue of real) {
      console.log(`  ⚠ RÉSIDUEL [${id}] ${issue.message}`);
    }
  }

  if (remainingIssues === 0) {
    console.log("✓ Aucune erreur résiduelle détectée.");
  } else {
    console.log(`\n⚠ ${remainingIssues} erreur(s) résiduelle(s) — vérification manuelle recommandée.`);
  }
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
