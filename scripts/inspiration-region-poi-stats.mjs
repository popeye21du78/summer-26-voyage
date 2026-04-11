/**
 * Stats lieux-central.json par région carte (MAP_REGIONS).
 * Usage : node scripts/inspiration-region-poi-stats.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MAP_REGIONS = [
  { id: "bretagne", name: "Bretagne", deptCodes: ["22", "29", "35", "56"] },
  { id: "normandie", name: "Normandie", deptCodes: ["14", "27", "50", "61", "76"] },
  { id: "picardie-flandre", name: "Picardie et Flandre", deptCodes: ["02", "59", "60", "62", "80"] },
  { id: "champagne", name: "Champagne", deptCodes: ["08", "10", "51", "52"] },
  { id: "lorraine", name: "Lorraine", deptCodes: ["54", "55", "57", "88"] },
  { id: "alsace", name: "Alsace", deptCodes: ["67", "68"] },
  { id: "franche-comte", name: "Franche-Comté", deptCodes: ["25", "39", "70", "90"] },
  { id: "bourgogne", name: "Bourgogne", deptCodes: ["21", "58", "71", "89"] },
  { id: "ile-de-france", name: "Île-de-France", deptCodes: ["75", "77", "78", "91", "92", "93", "94", "95"] },
  { id: "val-loire-centre", name: "Val de Loire et Centre", deptCodes: ["18", "28", "36", "37", "41", "45"] },
  { id: "angevin-maine", name: "Anjou et Maine", deptCodes: ["49", "53", "72"] },
  { id: "nantais-vendee", name: "Pays nantais et Vendée", deptCodes: ["44", "85"] },
  { id: "poitou-saintonge", name: "Poitou et Saintonge", deptCodes: ["16", "17", "79", "86"] },
  { id: "limousin", name: "Limousin", deptCodes: ["19", "23", "87"] },
  { id: "perigord-quercy", name: "Périgord et Quercy", deptCodes: ["24", "46", "47"] },
  { id: "gironde-landes", name: "Gironde et Landes", deptCodes: ["33", "40"] },
  { id: "pays-basque-bearn", name: "Pays basque et Béarn", deptCodes: ["64", "65"] },
  { id: "toulousain-gascogne", name: "Toulousain et Gascogne", deptCodes: ["09", "31", "32", "82"] },
  { id: "rouergue-cevennes", name: "Rouergue et Cévennes", deptCodes: ["07", "12", "48"] },
  { id: "languedoc-roussillon", name: "Languedoc et Roussillon", deptCodes: ["11", "30", "34", "66", "81"] },
  { id: "provence", name: "Provence", deptCodes: ["04", "05", "13", "84"] },
  { id: "cote-dazur", name: "Côte d'Azur", deptCodes: ["06", "83"] },
  { id: "corse", name: "Corse", deptCodes: ["2A", "2B"] },
  { id: "auvergne", name: "Auvergne", deptCodes: ["03", "15", "43", "63"] },
  { id: "savoie", name: "Savoie et Haute-Savoie", deptCodes: ["73", "74"] },
  { id: "dauphine-rhone", name: "Dauphiné, Lyonnais et Forez", deptCodes: ["01", "26", "38", "42", "69"] },
];

function padDep(code) {
  const u = String(code).trim().toUpperCase();
  if (u === "2A" || u === "2B") return u;
  return u.padStart(2, "0");
}

const DEPT_TO_REGION = new Map();
for (const r of MAP_REGIONS) {
  for (const c of r.deptCodes) {
    DEPT_TO_REGION.set(padDep(c), r.id);
  }
}

const raw = JSON.parse(fs.readFileSync(path.join(root, "data/cities/lieux-central.json"), "utf8"));
const lieux = Array.isArray(raw.lieux) ? raw.lieux : [];

function bucketType(st) {
  const t = (st || "").toLowerCase();
  if (t.includes("patrimoine")) return "patrimoine";
  if (t.includes("plage")) return "plage";
  if (t.includes("rando")) return "rando";
  return "autre";
}

const byRegion = new Map();
for (const r of MAP_REGIONS) {
  byRegion.set(r.id, { total: 0, patrimoine: 0, plage: 0, rando: 0, autre: 0 });
}

for (const l of lieux) {
  const rid = DEPT_TO_REGION.get(padDep(l.code_dep || ""));
  if (!rid) continue;
  const row = byRegion.get(rid);
  if (!row) continue;
  row.total++;
  row[bucketType(l.source_type)]++;
}

console.log(JSON.stringify({ generated: new Date().toISOString(), regions: Object.fromEntries(byRegion) }, null, 2));
