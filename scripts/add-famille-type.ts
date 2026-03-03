/**
 * Ajoute la colonne famille_type aux lieux de lieux-central.json.
 * Familles : ville, village, musee, rando, chateau, abbaye, site_naturel, patrimoine, autre
 * "autre" réservé aux seuls cas inclassables : quartiers, parcs thématiques.
 * Plages → famille "plage".
 * Stations, ports, viticoles → ville ou village selon categorie_taille.
 *
 * Usage : npx tsx scripts/add-famille-type.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const JSON_PATH = join(process.cwd(), "data", "cities", "lieux-central.json");

type FamilleType =
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

interface LieuLigne {
  source_type: string;
  type_precis?: string;
  nom?: string;
  activites_notables?: string;
  categorie_taille?: string;
  population?: number | string;
  [key: string]: unknown;
}

function isVille(lieu: LieuLigne): boolean {
  const cat = String(lieu.categorie_taille || "").toLowerCase();
  const pop = typeof lieu.population === "number" ? lieu.population : parseInt(String(lieu.population || "0"), 10) || 0;
  if (cat === "grande_ville" || cat === "ville_moyenne") return true;
  if (cat === "village" || cat === "hameau") return false;
  if (pop >= 10000) return true;
  return false;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[êèéë]/g, "e")
    .replace(/[àâä]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u");
}

function getFamilleType(lieu: LieuLigne): FamilleType {
  const st = String(lieu.source_type || "").toLowerCase();
  const tp = norm(String(lieu.type_precis || ""));
  const nom = norm(String(lieu.nom || ""));

  if (st === "rando") return "rando";
  if (st === "plage") return "plage";

  // Quartiers, parcs thématiques → autre (vraiment inclassables)
  if (
    tp.includes("quartier") ||
    tp.includes("parc thematique")
  ) {
    return "autre";
  }

  // Château (ordre prioritaire)
  if (
    tp.includes("chateau") ||
    tp.includes("forteresse") ||
    tp.includes("site castral") ||
    tp.includes("place forte") ||
    tp.includes("chateau-fort") ||
    tp.includes("chateaux en ruines") ||
    nom.includes("chateau") ||
    (tp.includes("ville de chateau") && !tp.includes("village"))
  ) {
    return "chateau";
  }

  // Abbaye
  if (
    tp.includes("abbaye") ||
    tp.includes("monastere") ||
    tp.includes("cistercien") ||
    tp.includes("chartreuse")
  ) {
    return "abbaye";
  }

  // Musée
  if (tp.includes("musee") || tp.includes("exposition")) {
    return "musee";
  }

  // Site naturel : lacs, montagnes, caps, forêts, grottes, cascades, gorges, massifs, dunes, baies, îles, réserves
  if (
    tp.includes("lac") ||
    tp.includes("reserve naturelle") ||
    tp.includes("parc naturel") ||
    tp.includes("parc national") ||
    tp.includes("site naturel") ||
    tp.includes("montagne") ||
    tp.includes("station de montagne") ||
    tp.includes("col de montagne") ||
    (tp.includes("cap") && !tp.includes("escape")) ||
    tp.includes("pointe") ||
    tp.includes("foret") ||
    tp.includes("grotte") ||
    tp.includes("cascade") ||
    tp.includes("gorges") ||
    tp.includes("massif") ||
    tp.includes("dune") ||
    tp.includes("baie") ||
    tp.includes("vallee") ||
    tp.includes("region naturelle") ||
    tp.includes("espace naturel") ||
    tp.includes("arboretum") ||
    tp.includes("site isole") ||
    tp.includes("sommet") ||
    tp.includes("canyon") ||
    tp.includes("cirque") ||
    tp.includes("falaise") ||
    tp.includes("ile ") ||
    tp.includes(" île") ||
    nom.includes("lac ") ||
    nom.includes("dune ") ||
    nom.includes("baie ") ||
    nom.includes("ile aux ")
  ) {
    return "site_naturel";
  }

  // Ville ou village (cités, centres historiques) — pas patrimoine, ce sont des localités
  if (
    tp.includes("cite medievale") ||
    tp.includes("cite episcopale") ||
    tp.includes("cite fortifiee") ||
    tp.includes("ville fortifiee") ||
    tp.includes("ville d'art") ||
    tp.includes("citadelle") ||
    tp.includes("centre historique") ||
    tp.includes("site religieux")
  ) {
    return isVille(lieu) ? "ville" : "village";
  }

  // Patrimoine : monuments isolés (ponts, viaducs, sites archéologiques, etc.) — pas les villes/villages
  if (
    tp.includes("cathedrale") ||
    tp.includes("basilique") ||
    tp.includes("pont ") ||
    tp.includes("viaduc") ||
    tp.includes("site archeologique") ||
    tp.includes("megalithe") ||
    tp.includes("troglodyte") ||
    tp.includes("palais") ||
    tp.includes("monument") ||
    tp.includes("chapelle") ||
    tp.includes("eglise") ||
    tp.includes("ouvrage") ||
    nom.includes("pont ") ||
    nom.includes("viaduc")
  ) {
    return "patrimoine";
  }

  // Village (inclut cité de caractère = village selon décision)
  if (
    tp.includes("village") ||
    tp.includes("hameau") ||
    tp.includes("bourg") ||
    tp.includes("plus beaux villages") ||
    tp.includes("petit bourg") ||
    tp.includes("bastide") ||
    tp.includes("charme rural") ||
    tp.includes("cite de caractere")
  ) {
    return "village";
  }

  // Ville ou village selon taille : stations, ports, cités, villes (tags = station, port, viticole à ajouter plus tard)
  if (
    tp.includes("ville") ||
    tp.includes("cite") ||
    tp.includes("capitale") ||
    tp.includes("prefecture") ||
    tp.includes("station") ||
    tp.includes("port") ||
    tp.includes("viticole") ||
    tp.includes("centre historique") ||
    tp.includes("metropole") ||
    tp.includes("petite ville")
  ) {
    return isVille(lieu) ? "ville" : "village";
  }

  // Reste : lieux habités non encore classés → ville ou village selon taille
  if (tp.length > 0) {
    return isVille(lieu) ? "ville" : "village";
  }

  return "autre";
}

/** Corrige les données connues erronées avant le calcul famille_type */
function fixKnownBadData(lieux: LieuLigne[]): void {
  for (const lieu of lieux) {
    const nom = String(lieu.nom || "").trim();
    const slug = String(lieu.slug || "").trim();
    // Porto-Vecchio : Corse (2A), pas Pyrénées-Orientales (66)
    if (slug === "porto-vecchio" || nom === "Porto-Vecchio") {
      lieu.code_dep = "2A";
      lieu.departement = "Corse-du-Sud";
      if (lieu.population === 121616) lieu.population = 12000;
    }
    // Île aux Oiseaux : réserve naturelle, pas une ville (population de la commune erronée)
    if (slug === "ile-aux-oiseaux" || nom === "Île aux Oiseaux") {
      lieu.population = 10;
      lieu.categorie_taille = "";
    }
  }
}

function main() {
  const raw = readFileSync(JSON_PATH, "utf-8");
  const data = JSON.parse(raw) as { lieux?: LieuLigne[] };

  if (!Array.isArray(data.lieux)) {
    console.error("❌ Structure invalide : lieux attendu");
    process.exit(1);
  }

  fixKnownBadData(data.lieux);

  const stats: Record<FamilleType, number> = {
    ville: 0,
    village: 0,
    musee: 0,
    rando: 0,
    chateau: 0,
    abbaye: 0,
    site_naturel: 0,
    patrimoine: 0,
    plage: 0,
    autre: 0,
  };

  for (const lieu of data.lieux) {
    const famille = getFamilleType(lieu);
    lieu.famille_type = famille;
    stats[famille]++;
  }

  writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), "utf-8");

  console.log("✅ famille_type ajouté à", data.lieux.length, "lieux");
  console.log("   Répartition:", Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(", "));
}

main();
