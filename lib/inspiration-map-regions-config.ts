/**
 * Découpage carte inspiration : ~26 zones = fusion de départements (frontières réelles).
 * Ajusté par rapport au découpage « provinces » : regroupements logiques, pas d’algo POI.
 */

export type MapRegionDef = {
  id: string;
  name: string;
  deptCodes: string[];
};

export const MAP_REGIONS: MapRegionDef[] = [
  { id: "bretagne", name: "Bretagne", deptCodes: ["22", "29", "35", "56"] },
  { id: "normandie", name: "Normandie", deptCodes: ["14", "27", "50", "61", "76"] },
  {
    id: "picardie-flandre",
    name: "Picardie et Flandre",
    deptCodes: ["02", "59", "60", "62", "80"],
  },
  { id: "champagne", name: "Champagne", deptCodes: ["08", "10", "51", "52"] },
  { id: "lorraine", name: "Lorraine", deptCodes: ["54", "55", "57", "88"] },
  { id: "alsace", name: "Alsace", deptCodes: ["67", "68"] },
  { id: "franche-comte", name: "Franche-Comté", deptCodes: ["25", "39", "70", "90"] },
  { id: "bourgogne", name: "Bourgogne", deptCodes: ["21", "58", "71", "89"] },
  {
    id: "ile-de-france",
    name: "Île-de-France",
    deptCodes: ["75", "77", "78", "91", "92", "93", "94", "95"],
  },
  /** Berry + Val de Loire + Eure-et-Loir (Centre élargi). */
  {
    id: "val-loire-centre",
    name: "Val de Loire et Centre",
    deptCodes: ["18", "28", "36", "37", "41", "45"],
  },
  { id: "angevin-maine", name: "Anjou et Maine", deptCodes: ["49", "53", "72"] },
  { id: "nantais-vendee", name: "Pays nantais et Vendée", deptCodes: ["44", "85"] },
  {
    id: "poitou-saintonge",
    name: "Poitou et Saintonge",
    deptCodes: ["16", "17", "79", "86"],
  },
  { id: "limousin", name: "Limousin", deptCodes: ["19", "23", "87"] },
  { id: "perigord-quercy", name: "Périgord et Quercy", deptCodes: ["24", "46", "47"] },
  { id: "gironde-landes", name: "Gironde et Landes", deptCodes: ["33", "40"] },
  {
    id: "pays-basque-bearn",
    name: "Pays basque et Béarn",
    deptCodes: ["64", "65"],
  },
  {
    id: "toulousain-gascogne",
    name: "Toulousain et Gascogne",
    deptCodes: ["09", "31", "32", "82"],
  },
  {
    id: "rouergue-cevennes",
    name: "Rouergue et Cévennes",
    deptCodes: ["07", "12", "48"],
  },
  {
    id: "languedoc-roussillon",
    name: "Languedoc et Roussillon",
    deptCodes: ["11", "30", "34", "66", "81"],
  },
  {
    id: "provence",
    name: "Provence",
    deptCodes: ["04", "05", "13", "84"],
  },
  {
    id: "cote-dazur",
    name: "Côte d’Azur",
    deptCodes: ["06", "83"],
  },
  { id: "corse", name: "Corse", deptCodes: ["2A", "2B"] },
  { id: "auvergne", name: "Auvergne", deptCodes: ["03", "15", "43", "63"] },
  { id: "savoie", name: "Savoie et Haute-Savoie", deptCodes: ["73", "74"] },
  {
    id: "dauphine-rhone",
    name: "Dauphiné, Lyonnais et Forez",
    deptCodes: ["01", "26", "38", "42", "69"],
  },
];

const DEPT_TO_REGION = new Map<string, string>();
for (const r of MAP_REGIONS) {
  for (const c of r.deptCodes) {
    const k = padDept(c);
    if (DEPT_TO_REGION.has(k)) throw new Error(`Département ${k} en double`);
    DEPT_TO_REGION.set(k, r.id);
  }
}

function padDept(code: string): string {
  const u = code.toUpperCase();
  if (u === "2A" || u === "2B") return u;
  return u.padStart(2, "0");
}

const EXPECTED = 96;
if (DEPT_TO_REGION.size !== EXPECTED) {
  throw new Error(
    `Partition : ${DEPT_TO_REGION.size} départements (attendu ${EXPECTED})`
  );
}

export function mapRegionIdForDeptCode(code: string): string | undefined {
  return DEPT_TO_REGION.get(padDept(code));
}

export function mapRegionById(id: string): MapRegionDef | undefined {
  return MAP_REGIONS.find((r) => r.id === id);
}
