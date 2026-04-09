/**
 * Script de nettoyage de lieux-central.json
 *
 * Corrige :
 * 1. categorie_taille fausse pour les non-villes (abbayes, chateaux, villages classés grande_ville)
 * 2. population héritée de la commune plutôt que du lieu
 * 3. duree_estimee vide pour les non-randos
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "data", "cities", "lieux-central.json");
const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));
const lieux = raw.lieux;

const VILLE_FAMILIES = new Set(["ville"]);

const DUREE_DEFAULTS = {
  metropole:     { ville: "2 journées" },
  grande_ville:  { ville: "1 journée" },
  ville_moyenne: { ville: "demi-journée" },
  petite_ville:  { ville: "3h" },
  village:       { base: "45 min", pbvf: "2h", beau: "1h30" },
  hameau:        { base: "30 min" },
  chateau:       "1h30",
  abbaye:        "1h",
  musee:         "2h",
  patrimoine:    "1h",
  site_naturel:  "1h",
  plage:         "3h",
  rando:         null, // already has data
  autre:         "1h",
};

let fixedCat = 0;
let fixedPop = 0;
let fixedDuree = 0;

for (const lieu of lieux) {
  const fam = lieu.famille_type || "autre";
  const cat = lieu.categorie_taille || "";
  const scoreEst = parseInt(lieu.score_esthetique) || 0;
  const isPBVF = (lieu.plus_beaux_villages || "").toLowerCase().includes("oui");

  // --- 1. Fix categorie_taille for non-ville entries ---
  if (!VILLE_FAMILIES.has(fam)) {
    const villeCats = ["grande_ville", "metropole", "ville_moyenne", "petite_ville"];
    if (villeCats.includes(cat)) {
      if (fam === "village") {
        lieu.categorie_taille = isPBVF ? "village" : (cat === "petite_ville" ? "village" : "village");
      } else {
        lieu.categorie_taille = fam;
      }
      fixedCat++;
    }

    // Reset population for non-ville non-village entries (chateaux, abbayes, etc.)
    if (!["village"].includes(fam)) {
      const pop = typeof lieu.population === "number" ? lieu.population : parseInt(lieu.population) || 0;
      if (pop > 5000) {
        lieu.population = 0;
        fixedPop++;
      }
    } else {
      // Village with unrealistic population
      const pop = typeof lieu.population === "number" ? lieu.population : parseInt(lieu.population) || 0;
      if (pop > 15000) {
        lieu.population = 0;
        fixedPop++;
      }
    }
  }

  // --- 2. Fill duree_estimee ---
  const duree = (lieu.duree_estimee || "").trim();
  if (duree === "" && fam !== "rando") {
    let newDuree = "";

    if (fam === "ville") {
      const vCat = lieu.categorie_taille || "ville_moyenne";
      if (vCat === "metropole") newDuree = "2 journées";
      else if (vCat === "grande_ville") newDuree = "1 journée";
      else if (vCat === "ville_moyenne") newDuree = "demi-journée";
      else newDuree = "3h";
    } else if (fam === "village") {
      if (isPBVF || scoreEst >= 9) newDuree = "2h";
      else if (scoreEst >= 7) newDuree = "1h30";
      else if (cat === "hameau") newDuree = "30 min";
      else newDuree = "45 min";
    } else if (fam === "chateau") {
      newDuree = scoreEst >= 8 ? "2h" : "1h30";
    } else if (fam === "abbaye") {
      newDuree = scoreEst >= 8 ? "1h30" : "1h";
    } else if (fam === "musee") {
      newDuree = scoreEst >= 8 ? "3h" : "2h";
    } else if (fam === "plage") {
      newDuree = "3h";
    } else if (fam === "site_naturel") {
      newDuree = scoreEst >= 8 ? "2h" : "1h";
    } else if (fam === "patrimoine") {
      newDuree = scoreEst >= 8 ? "1h30" : "1h";
    } else {
      newDuree = "1h";
    }

    if (newDuree) {
      lieu.duree_estimee = newDuree;
      fixedDuree++;
    }
  }
}

// Write back
fs.writeFileSync(SRC, JSON.stringify(raw, null, 2), "utf8");

console.log(`Fixed ${fixedCat} categorie_taille entries`);
console.log(`Fixed ${fixedPop} population entries`);
console.log(`Filled ${fixedDuree} duree_estimee entries`);
console.log("Done. lieux-central.json updated.");
