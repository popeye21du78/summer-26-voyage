/**
 * Scoring des lieux selon le profil de recherche.
 * Pipeline progressif : 0.Région → 1.Activités → 2.Pépites (villes) → 3.Cadre → 4.Proportions.
 * Priorité au score_esthetique (surtout villes/villages) pour le tri final.
 */

import type { ProfilRecherche } from "./quiz-to-profil";

export type FamilleType =
  | "ville"
  | "village"
  | "musee"
  | "rando"
  | "chateau"
  | "abbaye"
  | "site_naturel"
  | "patrimoine"
  | "plage"
  | "autre";

export interface LieuLigne {
  source_type: string;
  code_dep: string;
  departement: string;
  nom: string;
  slug: string;
  type_precis?: string;
  famille_type?: FamilleType;
  tags_architecture?: string;
  tags_cadre?: string;
  activites_notables?: string;
  plus_beaux_villages?: string;
  score_esthetique?: string;
  score_notoriete?: string;
  categorie_taille?: string;
  population?: number | string;
  lat?: number;
  lng?: number;

  // Champs spécialisés (plages / randos) depuis lieux-central
  type_plage?: string;
  surf?: string;
  naturiste?: string;
  familiale?: string;

  niveau_souhaite?: string;
  difficulte?: string;
  denivele_positif_m?: string;
  distance_km?: string;
  duree_estimee?: string;
}

export interface LieuScore extends LieuLigne {
  score: number;
  facteurs: string[];
  /** Famille utilisée pour le bucketing (plage, rando, ville, village, chateau, musee, site_naturel, autre) */
  bucketFamille: string;
  /** Tags multiples (ex: village-château → ["village", "chateau"]) */
  allTags: string[];
  /** Trace explicative de sélection (quota, groupe, fallback, etc.) */
  selectionTrace?: string[];
}

function parseTags(value: string | undefined): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim().replace(/[êè]/g, "e"))
    .filter(Boolean);
}

/** Détermine le bucket famille pour un lieu (aligné sur famillesIncluses et proportions) */
function getBucketFamille(lieu: LieuLigne): string {
  if (lieu.source_type === "plage") return "plage";
  if (lieu.source_type === "rando") return "rando";
  const ft = (lieu.famille_type ?? "autre") as string;
  if (["ville", "village", "chateau", "musee", "abbaye", "site_naturel", "patrimoine"].includes(ft)) {
    return ft;
  }
  return "autre";
}

/**
 * Tags multiples : un village PBVF classé famille_type=chateau
 * obtient les tags ["village", "chateau"]. Permet un comptage
 * intelligent dans applyProportions.
 */
function getAllTags(lieu: LieuLigne): string[] {
  const primary = getBucketFamille(lieu);
  const tags = new Set<string>([primary]);
  const cat = String(lieu.categorie_taille ?? "").toLowerCase();
  const ft = String(lieu.famille_type ?? "").toLowerCase();
  const nom = String(lieu.nom ?? "").toLowerCase();
  const activites = String(lieu.activites_notables ?? "").toLowerCase();

  // Village/hameau classé comme château → double tag
  if ((cat === "hameau" || cat === "village") && ft === "chateau") {
    tags.add("village");
    tags.add("chateau");
  }
  // Patrimoine dont le nom ou les activités mentionnent "château"
  if (lieu.source_type === "patrimoine" && (cat === "hameau" || cat === "village")) {
    if (nom.includes("château") || nom.includes("chateau") ||
        activites.includes("château") || activites.includes("chateau")) {
      tags.add("chateau");
    }
  }
  // Village avec une abbaye notable
  if ((cat === "hameau" || cat === "village") && ft === "abbaye") {
    tags.add("village");
    tags.add("abbaye");
  }

  return [...tags];
}

/** Vérifie si le lieu est une grande ville */
function isGrandeVille(lieu: LieuLigne): boolean {
  const cat = String(lieu.categorie_taille ?? "").toLowerCase();
  const pop = typeof lieu.population === "number" ? lieu.population : parseInt(String(lieu.population || "0"), 10) || 0;
  return cat === "grande_ville" || pop >= 50000;
}

/** Score esthétique numérique (0–10) */
function getScoreEsthetique(lieu: LieuLigne): number {
  return parseInt(String(lieu.score_esthetique ?? "5"), 10) || 5;
}

function getScoreNotoriete(lieu: LieuLigne): number {
  const raw = lieu.score_notoriete;
  const s = raw == null ? "" : String(raw).trim();
  if (!s) {
    // Fallback important : si la notoriété est absente, on évite de classer une grande ville en "pépite" par défaut.
    // (sinon on se retrouve avec des compléments incohérents et des notoriétés 10 qui dominent).
    if (isGrandeVille(lieu)) return 8;
    return 5;
  }
  const n = parseInt(s, 10) || 5;
  // IMPORTANT : l'échelle score_notoriete dans les données est inversée :
  // 1 = très connu, 10 = très peu connu.
  // On convertit vers "connu" (1 peu connu → 10 très connu) pour la logique pépites/classiques.
  const known = clamp(11 - n, 1, 10);
  return known;
}

function parseOuiNon(value: string | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "oui";
}

function parseNumberLoose(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseDurationHours(value: string | undefined): number | null {
  if (!value) return null;
  // Formats attendus : "1h06", "4h07", "6h49"…
  const m = String(value).trim().match(/^(\d+)\s*h(?:\s*(\d+))?\s*$/i);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10) || 0;
  const min = parseInt(m[2] ?? "0", 10) || 0;
  return h + min / 60;
}

function categorizeRandoDuree(lieu: LieuLigne): "courte" | "moyenne" | "longue" | null {
  const hours = parseDurationHours(lieu.duree_estimee);
  if (hours !== null) {
    if (hours < 2) return "courte";
    if (hours <= 4) return "moyenne";
    return "longue";
  }
  const km = parseNumberLoose(lieu.distance_km);
  if (km !== null) {
    if (km < 6) return "courte";
    if (km <= 12) return "moyenne";
    return "longue";
  }
  return null;
}

function categorizeRandoDenivele(lieu: LieuLigne): "faible" | "moyen" | "fort" | null {
  const d = parseNumberLoose(lieu.denivele_positif_m);
  if (d === null) return null;
  if (d < 300) return "faible";
  if (d <= 700) return "moyen";
  return "fort";
}

function scoreTriPreference(pref: ProfilRecherche["plageSurf"], isTrue: boolean): number {
  if (!pref || pref === "peu_importe") return 0;
  if (pref === "oui") return isTrue ? 15 : -10;
  // pref === "non"
  return isTrue ? -10 : 3;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Petitesse (0..1) : 0 = grande ville, 1 = petit village/hameau.
 * Sert uniquement à atténuer l'effet "trop connu" pour les petits lieux (alpha=3).
 */
function computeSmallness(lieu: LieuLigne): number {
  if (isGrandeVille(lieu)) return 0;

  const pop = typeof lieu.population === "number"
    ? lieu.population
    : parseInt(String(lieu.population || "0"), 10) || 0;

  if (pop > 0) {
    if (pop < 800) return 1;
    if (pop < 2500) return 0.85;
    if (pop < 10000) return 0.45;
    if (pop < 50000) return 0.2;
    return 0;
  }

  const cat = String(lieu.categorie_taille ?? "").toLowerCase();
  if (cat === "village") return 0.9;
  if (cat === "petite_ville") return 0.4;
  if (cat === "ville_moyenne") return 0.2;
  return 0.2;
}

function computePepiteFlags(lieu: LieuLigne): {
  smallness: number;
  notoriete: number;
  notorieteBrute: number;
  notorieteAdj: number;
  isPepite: boolean;
  isDual: boolean;
} {
  const smallness = computeSmallness(lieu);
  const notorieteBrute = parseInt(String(lieu.score_notoriete ?? "5"), 10) || 5;
  const notoriete = getScoreNotoriete(lieu); // "connu" après conversion
  // alpha=3 (validé)
  const notorieteAdj = clamp(notoriete - 3 * smallness, 0, 10);
  const isPepite = notorieteAdj <= 6;

  const est = getScoreEsthetique(lieu);
  const pbvf = lieu.plus_beaux_villages === "oui";
  // PBVF : toujours dual (peut compter en pépite OU en classique)
  const isDual = pbvf || (smallness >= 0.85 && notoriete >= 8 && est >= 8);

  return { smallness, notoriete, notorieteBrute, notorieteAdj, isPepite, isDual };
}

export function scoreLieux(profil: ProfilRecherche, lieux: LieuLigne[]): LieuScore[] {
  const scored: LieuScore[] = [];

  for (const lieu of lieux) {
    const lat = typeof lieu.lat === "number" ? lieu.lat : parseFloat(String(lieu.lat || ""));
    const lng = typeof lieu.lng === "number" ? lieu.lng : parseFloat(String(lieu.lng || ""));
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    // ----- Phase 0 : Filtre région (hard) -----
    if (profil.departements && profil.departements.length > 0) {
      const codeDep = String(lieu.code_dep || "").padStart(2, "0");
      if (!profil.departements.includes(codeDep)) continue;
    }

    const bucketFamille = getBucketFamille(lieu);

    // ----- Phase 1 : Filtre activités (familles incluses) -----
    const famillesIncluses = profil.famillesIncluses;
    if (famillesIncluses && famillesIncluses.length > 0) {
      const inclus =
        famillesIncluses.includes(bucketFamille) ||
        (bucketFamille === "abbaye" && famillesIncluses.includes("chateau")) ||
        (bucketFamille === "site_naturel" && famillesIncluses.includes("rando")) ||
        (bucketFamille === "patrimoine" && famillesIncluses.some((f) => ["village", "chateau", "ville", "musee"].includes(f)));
      if (!inclus) continue;
    }

    const facteurs: string[] = [];
    let score = 0;

    const tagsCadreLieu = parseTags(lieu.tags_cadre);
    const tagsArchLieu = parseTags(lieu.tags_architecture);

    if (lieu.source_type === "plage") {
      const typePlage = String(lieu.type_plage ?? "").trim().toLowerCase();
      if (typePlage === "plage_lac") {
        tagsCadreLieu.push("lac");
      } else {
        tagsCadreLieu.push("bord_de_mer");
      }
    }
    if (lieu.source_type === "rando") {
      tagsCadreLieu.push("randos", "moyenne_montagne", "haute_montagne");
    }

    // ----- Esthétique : priorité absolue (villes/villages/patrimoine) -----
    if (["ville", "village", "patrimoine"].includes(bucketFamille)) {
      const est = getScoreEsthetique(lieu);
      score += est * 1000;
      facteurs.push(`esthétique×1000 (${est})`);
    }
    // Châteaux/abbayes : base esthétique (données présentes en base) pour que les mieux adaptés au profil remontent
    if (["chateau", "abbaye"].includes(bucketFamille)) {
      const est = getScoreEsthetique(lieu);
      score += est * 100;
      facteurs.push(`esthétique×100 (${est})`);
    }
    // Plages/randos/sites naturels : score de base garanti (les données n'ont souvent pas de score_esthetique)
    if (["plage", "rando", "site_naturel"].includes(bucketFamille)) {
      const est = getScoreEsthetique(lieu);
      const baseScore = Math.max(est, 5) * 100;
      score += baseScore;
      facteurs.push(`base nature ${baseScore} (est=${est})`);
    }

    // ----- Phase 2 : villes — éviter grandes villes (option) -----
    if (bucketFamille === "ville") {
      const grandeVille = isGrandeVille(lieu);
      if (profil.eviterGrandesVilles && grandeVille) {
        score -= 25;
        facteurs.push("éviter grandes villes -25");
      }
    }

    // ----- Phase 2 bis : préférences plages / randos (si applicable) -----
    if (bucketFamille === "plage") {
      const typePlage = String(lieu.type_plage ?? "").trim().toLowerCase();
      const wantedTypes = profil.plageTypes ?? [];
      if (wantedTypes.length > 0) {
        if (wantedTypes.includes(typePlage as any)) {
          score += 20;
          facteurs.push("type plage +20");
        } else {
          score -= 6;
          facteurs.push("type plage -6");
        }
      }

      score += scoreTriPreference(profil.plageSurf, parseOuiNon(lieu.surf));
      if (profil.plageSurf && profil.plageSurf !== "peu_importe") facteurs.push("surf");

      score += scoreTriPreference(profil.plageNaturiste, parseOuiNon(lieu.naturiste));
      if (profil.plageNaturiste && profil.plageNaturiste !== "peu_importe") facteurs.push("naturiste");

      score += scoreTriPreference(profil.plageFamiliale, parseOuiNon(lieu.familiale));
      if (profil.plageFamiliale && profil.plageFamiliale !== "peu_importe") facteurs.push("familiale");
    }

    if (bucketFamille === "rando") {
      const niveau = String(lieu.niveau_souhaite ?? "").trim().toLowerCase();
      if (profil.randoNiveauSouhaite && profil.randoNiveauSouhaite !== "peu_importe") {
        if (niveau === profil.randoNiveauSouhaite) {
          score += 15;
          facteurs.push("niveau rando +15");
        } else if (niveau) {
          score -= 8;
          facteurs.push("niveau rando -8");
        }
      }

      if (profil.randoDuree && profil.randoDuree !== "peu_importe") {
        const cat = categorizeRandoDuree(lieu);
        if (cat === profil.randoDuree) {
          score += 10;
          facteurs.push("durée rando +10");
        } else if (cat) {
          score -= 5;
          facteurs.push("durée rando -5");
        }
      }

      if (profil.randoDenivele && profil.randoDenivele !== "peu_importe") {
        const cat = categorizeRandoDenivele(lieu);
        if (cat === profil.randoDenivele) {
          score += 10;
          facteurs.push("dénivelé +10");
        } else if (cat) {
          score -= 5;
          facteurs.push("dénivelé -5");
        }
      }
    }

    // ----- Phase 3 : Cadre (bonus) -----
    for (const { tag, poids } of profil.tagsCadre) {
      const tagNorm = tag.toLowerCase().replace(/[êè]/g, "e");
      if (tagsCadreLieu.some((t) => t.includes(tagNorm) || tagNorm.includes(t))) {
        const pts = Math.round(poids * 20);
        score += pts;
        facteurs.push(`${tag}+${pts}`);
      }
    }

    // Tags architecture
    for (const tag of profil.tagsArchitecture) {
      const tagNorm = tag.toLowerCase().replace(/[êè]/g, "e");
      if (tagsArchLieu.some((t) => t.includes(tagNorm) || tagNorm.includes(t))) {
        score += 15;
        facteurs.push(`${tag}+15`);
      }
    }

    // Plus beaux villages
    if (lieu.plus_beaux_villages === "oui") {
      score += 8;
      facteurs.push("Plus Beaux Villages+8");
    }

    scored.push({
      ...lieu,
      lat,
      lng,
      score,
      facteurs,
      bucketFamille,
      allTags: getAllTags(lieu),
    });
  }

  // Tri principal par score décroissant, puis par score_esthetique décroissant
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return getScoreEsthetique(b) - getScoreEsthetique(a);
  });

  return scored;
}

/** Bucket → clé des proportions */
const BUCKET_TO_PROP: Record<string, "plages" | "randos" | "chateaux" | "villages" | "villes" | "musees"> = {
  plage: "plages",
  rando: "randos",
  site_naturel: "randos",
  chateau: "chateaux",
  abbaye: "chateaux",
  village: "villages",
  patrimoine: "villages",
  autre: "villages",
  ville: "villes",
  musee: "musees",
};

/**
 * Sélection finale par proportions, avec priorité au score_esthetique au sein de chaque bucket.
 */
export function applyProportions(
  scored: LieuScore[],
  proportions: NonNullable<ProfilRecherche["proportionsAmbiance"]>,
  count: number,
  profil?: ProfilRecherche
): LieuScore[] {
  const byProp: Record<string, LieuScore[]> = {
    plages: [],
    randos: [],
    chateaux: [],
    villages: [],
    villes: [],
    musees: [],
  };

  // Phase 1: lieux mono-tag → bucket direct
  // Phase 2: lieux multi-tags → bucket le plus déficitaire
  const multiTagged: LieuScore[] = [];
  for (const lieu of scored) {
    const tags = lieu.allTags ?? [lieu.bucketFamille];
    if (tags.length <= 1) {
      const propKey = BUCKET_TO_PROP[tags[0] ?? lieu.bucketFamille] ?? "villages";
      byProp[propKey].push(lieu);
    } else {
      multiTagged.push(lieu);
    }
  }

  // Quotas cibles pour choisir le bucket le plus déficitaire
  const propKeys = Object.keys(byProp) as (keyof typeof byProp)[];
  const quotaTargets: Record<string, number> = {};
  for (const k of propKeys) {
    quotaTargets[k] = Math.round((count * ((proportions as any)[k] ?? 0)) / 100);
  }

  for (const lieu of multiTagged) {
    const candidateBuckets = lieu.allTags
      .map((t) => BUCKET_TO_PROP[t])
      .filter((b) => !!b) as string[];
    if (candidateBuckets.length === 0) {
      byProp.villages.push(lieu);
      continue;
    }
    // Pick the bucket with the biggest deficit (target - current)
    let bestBucket = candidateBuckets[0];
    let bestDeficit = -Infinity;
    for (const b of candidateBuckets) {
      const deficit = (quotaTargets[b] ?? 0) - (byProp[b]?.length ?? 0);
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestBucket = b;
      }
    }
    byProp[bestBucket].push(lieu);
  }

  for (const k of Object.keys(byProp)) {
    byProp[k].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return getScoreEsthetique(b) - getScoreEsthetique(a);
    });
  }

  function withTrace(ls: LieuScore, trace: string[]): LieuScore {
    return { ...ls, selectionTrace: trace };
  }

  function takeWithPepiteQuota(
    list: LieuScore[],
    n: number,
    bucketLabel: "villes" | "villages",
    allowPepitesForVilles: boolean
  ): LieuScore[] {
    if (!profil) return list.slice(0, n).map((ls, idx) => withTrace(ls, [`quota ${bucketLabel}: rang ${idx + 1}/${n}`]));
    if (n <= 0) return [];

    const pepPct = clamp(profil.pepitesPourcent ?? 50, 0, 100);
    // Crucial : par défaut, les pépites concernent surtout les villages.
    // Exception : si on n'a PAS de villages (villes-only), alors le curseur pépites s'applique aux villes.
    const nPep =
      bucketLabel === "villes"
        ? (allowPepitesForVilles ? Math.round((n * pepPct) / 100) : 0)
        : Math.round((n * pepPct) / 100);
    const nClass = Math.max(0, n - nPep);

    // Pré-calcul flags
    const flags = new Map<string, ReturnType<typeof computePepiteFlags>>();
    for (const l of list) flags.set(`${l.bucketFamille}-${l.slug}`, computePepiteFlags(l));

    const isGoodEsthetique = (l: LieuScore) => getScoreEsthetique(l) >= 6 || l.plus_beaux_villages === "oui";

    const pepitesCandidates =
      bucketLabel === "villes" && allowPepitesForVilles
        ? // Mode "villes-only" : on cherche des villes moins connues (secondaires),
          // tout en gardant l'esthétique comme garde-fou.
          [...list]
            .filter(isGoodEsthetique)
            .sort((a, b) => {
              const ka = getScoreNotoriete(a);
              const kb = getScoreNotoriete(b);
              // moins connu d'abord
              if (ka !== kb) return ka - kb;
              // puis esthétique/score
              if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
              return getScoreEsthetique(b) - getScoreEsthetique(a);
            })
        : list.filter((l) => {
            const f = flags.get(`${l.bucketFamille}-${l.slug}`)!;
            // Garde-fou : on ne prend pas de "pépites" moches ; PBVF autorisé.
            if (!(f.isPepite || f.isDual)) return false;
            return isGoodEsthetique(l);
          });

    const classiquesCandidatesAll =
      bucketLabel === "villes" && allowPepitesForVilles
        ? // Mode "villes-only" : les classiques = les plus connus/incontournables (mais beaux)
          [...list]
            .filter(isGoodEsthetique)
            .sort((a, b) => {
              const ka = getScoreNotoriete(a);
              const kb = getScoreNotoriete(b);
              // plus connu d'abord
              if (kb !== ka) return kb - ka;
              if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
              return getScoreEsthetique(b) - getScoreEsthetique(a);
            })
        : list.filter((l) => {
            const f = flags.get(`${l.bucketFamille}-${l.slug}`)!;
            return !f.isPepite || f.isDual;
          });

    // Pour les classiques : on privilégie aussi l'esthétique (>=6) tant que possible
    const classiquesCandidates = classiquesCandidatesAll.filter(isGoodEsthetique);

    // Fallback PBVF pour combler les pépites
    const pbvfFallback = list.filter((l) => l.plus_beaux_villages === "oui");

    const taken = new Set<string>();
    const out: LieuScore[] = [];

    const takePep = Math.min(nPep, list.length);
    for (const l of pepitesCandidates) {
      if (out.length >= takePep) break;
      const key = `${l.bucketFamille}-${l.slug}`;
      if (taken.has(key)) continue;
      const f = flags.get(key)!;
      taken.add(key);
      out.push(withTrace(l, [
        `quota ${bucketLabel}: pépites ${takePep}/${n} (curseur ${pepPct}%)`,
        ...(bucketLabel === "villes" && allowPepitesForVilles ? ["mode villes-only : villes secondaires d’abord"] : []),
        `pepite=${f.isPepite ? "oui" : "non"} dual=${f.isDual ? "oui" : "non"}`,
        `notoriété_brute=${f.notorieteBrute} notoriété_connu=${f.notoriete} k_adj=${f.notorieteAdj.toFixed(1)} petiteur=${f.smallness.toFixed(2)}`,
      ]));
    }

    if (out.length < takePep) {
      for (const l of pbvfFallback) {
        if (out.length >= takePep) break;
        const key = `${l.bucketFamille}-${l.slug}`;
        if (taken.has(key)) continue;
        const f = flags.get(key)!;
        taken.add(key);
        out.push(withTrace(l, [
          `quota ${bucketLabel}: pépites ${takePep}/${n} (curseur ${pepPct}%)`,
          "fallback PBVF pour combler les pépites",
          `pepite=${f.isPepite ? "oui" : "non"} dual=${f.isDual ? "oui" : "non"}`,
          `notoriété_brute=${f.notorieteBrute} notoriété_connu=${f.notoriete} k_adj=${f.notorieteAdj.toFixed(1)} petiteur=${f.smallness.toFixed(2)}`,
        ]));
      }
    }

    // Classiques : prioriser "vrais incontournables" (notoriété forte) puis score (dont esthétique)
    const takeClass = Math.min(nClass, Math.max(0, n - out.length));
    if (takeClass > 0) {
      // À faible % pépites (mode classiques), on ne "classe" pas la notoriété : l'esthétique doit rester la boussole.
      // On réserve la priorité "incontournables" (notoriété forte) aux cas extrêmes (>= 90% pépites).
      const sortedClassiques = [...classiquesCandidates].sort((a, b) => {
        if (pepPct >= 90) {
          const ka = getScoreNotoriete(a);
          const kb = getScoreNotoriete(b);
          const ga = isGrandeVille(a);
          const gb = isGrandeVille(b);
          const penalGa = profil.eviterGrandesVilles && ga;
          const penalGb = profil.eviterGrandesVilles && gb;
          const aa = penalGa ? 0 : ka;
          const bb = penalGb ? 0 : kb;
          if (bb !== aa) return bb - aa;
        }
        if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
        return getScoreEsthetique(b) - getScoreEsthetique(a);
      });

      for (const l of sortedClassiques) {
        if (out.length >= takePep + takeClass) break;
        const key = `${l.bucketFamille}-${l.slug}`;
        if (taken.has(key)) continue;
        const f = flags.get(key)!;
        taken.add(key);
        out.push(withTrace(l, [
          `quota ${bucketLabel}: classiques ${takeClass}/${n} (curseur ${pepPct}%)`,
          ...(bucketLabel === "villes" && allowPepitesForVilles ? ["mode villes-only : incontournables d’abord"] : []),
          `pepite=${f.isPepite ? "oui" : "non"} dual=${f.isDual ? "oui" : "non"}`,
          `notoriété_brute=${f.notorieteBrute} notoriété_connu=${f.notoriete} k_adj=${f.notorieteAdj.toFixed(1)} petiteur=${f.smallness.toFixed(2)}`,
        ]));
      }
    }

    // Complément si manque encore (rare)
    if (out.length < n) {
      // On essaie d'abord de compléter avec des classiques "ok" (esthétique >=6), sinon on prend ce qu'il reste.
      const complementPool = [...classiquesCandidatesAll.filter(isGoodEsthetique), ...list];
      for (const l of complementPool) {
        if (out.length >= n) break;
        const key = `${l.bucketFamille}-${l.slug}`;
        if (taken.has(key)) continue;
        taken.add(key);
        out.push(withTrace(l, [`quota ${bucketLabel}: complément (manque de candidats)`]));
      }
    }

    return out.slice(0, n);
  }

  const prop = proportions;
  /** Marge minimale sur les quotas pour respecter les % utilisateur */
  const QUOTA_MARGIN = 1.02;
  const withMargin = (n: number) => Math.round(n * QUOTA_MARGIN);

  const nPlages = Math.min(byProp.plages.length, withMargin(Math.round((count * prop.plages) / 100)));
  const nRandos = Math.min(byProp.randos.length, withMargin(Math.round((count * prop.randos) / 100)));
  const nChateaux = Math.min(byProp.chateaux.length, withMargin(Math.round((count * prop.chateaux) / 100)));
  const nVillages = Math.min(byProp.villages.length, withMargin(Math.round((count * prop.villages) / 100)));
  const nVilles = Math.min(byProp.villes.length, withMargin(Math.round((count * prop.villes) / 100)));
  const nMusees = Math.min(byProp.musees.length, withMargin(Math.round((count * prop.musees) / 100)));

  const allowPepitesForVilles = prop.villages === 0 && prop.villes > 0;

  const takeP = byProp.plages.slice(0, nPlages).map((ls, idx) => withTrace(ls, [`quota plages: rang ${idx + 1}/${nPlages}`]));
  const takeR = byProp.randos.slice(0, nRandos).map((ls, idx) => withTrace(ls, [`quota randos: rang ${idx + 1}/${nRandos}`]));
  const takeC = byProp.chateaux.slice(0, nChateaux).map((ls, idx) => withTrace(ls, [`quota châteaux: rang ${idx + 1}/${nChateaux}`]));
  const takeV = takeWithPepiteQuota(byProp.villages, nVillages, "villages", false);
  const takeVi = takeWithPepiteQuota(byProp.villes, nVilles, "villes", allowPepitesForVilles);
  const takeM = byProp.musees.slice(0, nMusees).map((ls, idx) => withTrace(ls, [`quota musées: rang ${idx + 1}/${nMusees}`]));

  const taken = new Set(
    [...takeP, ...takeR, ...takeC, ...takeV, ...takeVi, ...takeM].map((l) => `${l.bucketFamille}-${l.slug}`)
  );
  // Exclude types with 0% from complement to respect user intent
  const zeroTypes = new Set<string>();
  if (prop.plages === 0) zeroTypes.add("plage");
  if (prop.randos === 0) zeroTypes.add("rando");
  if (prop.chateaux === 0) { zeroTypes.add("chateau"); zeroTypes.add("abbaye"); }
  if (prop.villages === 0) zeroTypes.add("village");
  if (prop.villes === 0) zeroTypes.add("ville");
  if (prop.musees === 0) zeroTypes.add("musee");
  const restants = scored.filter((l) => {
    if (taken.has(`${l.bucketFamille}-${l.slug}`) || zeroTypes.has(l.bucketFamille)) return false;
    const pk = BUCKET_TO_PROP[l.bucketFamille] ?? "villages";
    return ((proportions as Record<string, number>)[pk] ?? 0) > 0;
  });
  const rest = count - takeP.length - takeR.length - takeC.length - takeV.length - takeVi.length - takeM.length;
  const complement = restants.slice(0, Math.max(0, rest)).map((ls, idx) => withTrace(ls, [`complément global: rang ${idx + 1}/${Math.max(0, rest)}`]));

  return [...takeP, ...takeR, ...takeC, ...takeV, ...takeVi, ...takeM, ...complement].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return getScoreEsthetique(b) - getScoreEsthetique(a);
  });
}
