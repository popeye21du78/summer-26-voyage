/**
 * Test CLI du generateur d'itineraire.
 *
 * Usage:
 *   npx tsx scripts/test-itinerary.ts
 *   npx tsx scripts/test-itinerary.ts --region "Provence-Alpes-Côte d'Azur" --nights 7
 *   npx tsx scripts/test-itinerary.ts --depart "Lyon" --arrivee "Marseille" --nights 5
 *   npx tsx scripts/test-itinerary.ts --regions "Occitanie,Nouvelle-Aquitaine" --nights 10 --rythme cool
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { scoreLieux, applyProportions, type LieuLigne } from "../lib/score-lieux";
import { generateItinerary, type ItineraryConfig } from "../lib/itinerary/generate";
import { haversine } from "../lib/itinerary/haversine";
import type { ProfilRecherche } from "../lib/quiz-to-profil";

const DB_PATH = join(process.cwd(), "data", "cities", "lieux-central.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && args[i + 1]) {
      opts[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return opts;
}

function findByName(lieux: LieuLigne[], name: string): LieuLigne | undefined {
  const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return lieux.find((l) => {
    const n = (l.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === norm || n.includes(norm);
  });
}

async function main() {
  const opts = parseArgs();
  const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const lieux: LieuLigne[] = db.lieux || db;

  const nights = parseInt(opts.nights ?? "7");
  const rythme = (opts.rythme as "cool" | "normal" | "intense") || "normal";
  const regionStr = opts.region || opts.regions || "";
  const regions = regionStr ? regionStr.split(",").map((r: string) => r.trim()) : [];

  // Point de depart
  let startPoint = { lat: 45.764, lng: 4.8357 }; // Lyon par defaut
  let startName = "Lyon";
  const departArg = opts.from || opts.depart;
  if (departArg) {
    const found = findByName(lieux, departArg);
    if (found?.lat && found?.lng) {
      startPoint = { lat: Number(found.lat), lng: Number(found.lng) };
      startName = found.nom;
    }
  }

  // Point d'arrivee
  let endPoint: { lat: number; lng: number } | undefined;
  let endName = "";
  const arriveeArg = opts.to || opts.arrivee;
  if (arriveeArg) {
    const found = findByName(lieux, arriveeArg);
    if (found?.lat && found?.lng) {
      endPoint = { lat: Number(found.lat), lng: Number(found.lng) };
      endName = found.nom;
    }
  }

  // Profil de test
  const profil: ProfilRecherche = {
    tagsCadre: [
      { tag: "bord_de_mer", poids: 3 },
      { tag: "montagne", poids: 2 },
      { tag: "campagne", poids: 2 },
    ],
    tagsArchitecture: ["medieval", "roman"],
    famillesIncluses: ["ville", "village", "chateau", "plage", "rando", "site_naturel", "patrimoine"],
    regions: regions.length > 0 ? regions : undefined,
    pepitesPourcent: 40,
    notoriete: "mix",
    eviterGrandesVilles: false,
    dureeJours: nights + 1,
    rythme,
    mood: "culturel",
    budgetRestos: "serre",
    compteRendu: "",
    proportionsAmbiance: {
      chateaux: 10,
      villages: 30,
      villes: 20,
      musees: 5,
      randos: 20,
      plages: 15,
    },
  };

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  GENERATEUR D'ITINERAIRE — TEST CLI`);
  console.log(`══════════════════════════════════════════`);
  console.log(`  Départ    : ${startName} (${startPoint.lat.toFixed(3)}, ${startPoint.lng.toFixed(3)})`);
  if (endPoint) console.log(`  Arrivée   : ${endName} (${endPoint.lat.toFixed(3)}, ${endPoint.lng.toFixed(3)})`);
  console.log(`  Nuits     : ${nights}`);
  console.log(`  Rythme    : ${rythme}`);
  if (regions.length) console.log(`  Régions   : ${regions.join(", ")}`);
  console.log(`  DB        : ${lieux.length} lieux`);
  console.log(`──────────────────────────────────────────\n`);

  // 1. Scoring
  console.log(`→ Scoring...`);
  const scored = scoreLieux(profil, lieux);
  console.log(`  ${scored.length} lieux scorés (passé le filtre régional)`);

  // 1b. Corridor filter AVANT la selection (si on a un point d'arrivee)
  let pool = scored;
  if (endPoint) {
    const { corridorFilter, adaptiveCorridorWidth } = await import("../lib/itinerary/corridor");
    const width = adaptiveCorridorWidth(startPoint, endPoint, nights);
    pool = corridorFilter(scored, (l) => ({ lat: Number(l.lat), lng: Number(l.lng) }), startPoint, endPoint, width);
    console.log(`  → Corridor ${Math.round(width)} km : ${pool.length} lieux dans la zone (${scored.length - pool.length} exclus)`);
  }

  // 2. Selection par proportions DANS le corridor
  const targetCount = Math.round((nights + 1) * (rythme === "cool" ? 2.5 : rythme === "intense" ? 4 : 3));
  console.log(`→ Sélection de ~${targetCount} lieux selon proportions...`);
  const selected = applyProportions(pool, profil.proportionsAmbiance!, targetCount, profil);
  console.log(`  ${selected.length} lieux retenus\n`);

  // Breakdown par famille
  const byFamille = new Map<string, number>();
  for (const l of selected) {
    byFamille.set(l.bucketFamille, (byFamille.get(l.bucketFamille) ?? 0) + 1);
  }
  console.log(`  Répartition :`);
  for (const [f, c] of byFamille) console.log(`    ${f}: ${c}`);
  console.log();

  // 3. Generation itineraire
  console.log(`→ Génération de l'itinéraire...`);
  const config: ItineraryConfig = {
    start: startPoint,
    end: endPoint,
    totalNights: nights,
    rythme,
  };

  const itinerary = generateItinerary(selected, config);

  console.log(`  ${itinerary.orderedPoints.length} lieux dans le corridor (${selected.length} avant filtre)`);
  console.log(`  ${itinerary.clusters.length} clusters géographiques`);
  console.log(`  Ordre des clusters : ${itinerary.clusterOrder.join(" → ")}`);
  console.log(`  Distance totale : ~${itinerary.totalDistanceKm} km\n`);

  // 4. Affichage jour par jour
  console.log(`══════════════════════════════════════════`);
  console.log(`  ITINERAIRE JOUR PAR JOUR`);
  console.log(`══════════════════════════════════════════\n`);

  let totalVisites = 0;
  for (const day of itinerary.days) {
    const sleepLabel = day.sleepAt
      ? `🛏 ${day.sleepAt.nom} (nuit ${day.sleepNights > 0 ? day.sleepNights : 1})`
      : `→ fin du voyage`;

    if (day.isStayDay) {
      console.log(`── Jour ${day.day} — SÉJOUR ──`);
      console.log(`  🏨 Journée libre à ${day.sleepAt?.nom ?? "?"} — explorer les alentours`);
      console.log(`  ${sleepLabel}`);
      console.log();
      continue;
    }

    console.log(`── Jour ${day.day} ──`);
    for (const p of day.points) {
      const icon = familleIcon(p.bucketFamille);
      console.log(`  ${icon} ${p.nom} (${p.departement}) — ${p.bucketFamille}, score ${p.score.toFixed(1)}`);
      totalVisites++;
    }
    console.log(`  ${sleepLabel}`);

    if (day.points.length >= 2) {
      let dayDist = 0;
      for (let i = 0; i < day.points.length - 1; i++) {
        dayDist += haversine(day.points[i].lat, day.points[i].lng, day.points[i + 1].lat, day.points[i + 1].lng);
      }
      console.log(`  📏 ~${Math.round(dayDist)} km dans la journée`);
    }
    console.log();
  }

  console.log(`══════════════════════════════════════════`);
  console.log(`  RÉSUMÉ`);
  console.log(`══════════════════════════════════════════`);
  console.log(`  ${itinerary.days.length} jours, ${totalVisites} visites`);
  console.log(`  ~${itinerary.totalDistanceKm} km au total`);
  console.log(`  ${itinerary.clusters.length} zones géographiques`);

  const sleepSummary = itinerary.days
    .filter((d) => d.sleepAt && !d.isStayDay)
    .map((d) => `${d.sleepAt!.nom} (${d.sleepNights}n)`);
  console.log(`  Nuits : ${sleepSummary.join(" → ")}`);

  // Generer carte HTML
  generateMap(itinerary, startName, endName);
}

function familleIcon(famille: string): string {
  const icons: Record<string, string> = {
    ville: "🏙",
    village: "🏘",
    chateau: "🏰",
    plage: "🏖",
    rando: "🥾",
    site_naturel: "🌿",
    musee: "🎨",
    patrimoine: "⛪",
    abbaye: "⛪",
    autre: "📍",
  };
  return icons[famille] ?? "📍";
}

function generateMap(itinerary: any, startName: string, endName: string) {
  const dayColors = [
    "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6",
    "#1abc9c", "#e91e63", "#ff9800", "#00bcd4", "#8bc34a", "#ff5722",
  ];

  type MapPoint = { lat: number; lng: number; nom: string; famille: string; dayNum: number; isSleep: boolean; isStay: boolean };
  const allPoints: MapPoint[] = [];
  const routeLines: { points: [number, number][]; color: string }[] = [];

  for (const day of itinerary.days) {
    const color = dayColors[(day.day - 1) % dayColors.length];
    const dayLine: [number, number][] = [];

    for (const p of day.points) {
      const isSleep = day.sleepAt && p.nom === day.sleepAt.nom;
      allPoints.push({
        lat: p.lat, lng: p.lng, nom: p.nom, famille: p.bucketFamille,
        dayNum: day.day, isSleep: !!isSleep, isStay: day.isStayDay,
      });
      dayLine.push([p.lat, p.lng]);
    }

    if (dayLine.length >= 2) {
      routeLines.push({ points: dayLine, color });
    }
  }

  const lats = allPoints.map((p) => p.lat);
  const lngs = allPoints.map((p) => p.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  // Pre-build legend items (avoids nested template literals)
  const legendItems = itinerary.days.map((d: any) => {
    const color = dayColors[(d.day - 1) % dayColors.length];
    let label: string;
    if (d.isStayDay) {
      label = "Jour " + d.day + " — séjour " + (d.sleepAt?.nom ?? "");
    } else {
      label = "Jour " + d.day + (d.sleepAt ? " → nuit " + d.sleepAt.nom : " — fin");
    }
    const stayBadge = d.isStayDay ? ' <span class="stay-badge">SÉJOUR</span>' : "";
    return '<div class="legend-item"><div class="legend-dot" style="background:' + color + '"></div>' + label + stayBadge + "</div>";
  }).join("\n  ");

  const visitCount = allPoints.filter((p) => !p.isStay).length;
  const routesJson = JSON.stringify(routeLines);
  const pointsJson = JSON.stringify(allPoints);
  const colorsJson = JSON.stringify(dayColors);

  const mapScript = [
    'const map = L.map("map").setView([' + centerLat + ", " + centerLng + "], 6);",
    'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {',
    "  attribution: '© OpenStreetMap', maxZoom: 18",
    "}).addTo(map);",
    "",
    "const routes = " + routesJson + ";",
    "routes.forEach(function(r) {",
    "  L.polyline(r.points, { color: r.color, weight: 3, opacity: 0.8 }).addTo(map);",
    "});",
    "",
    "const pts = " + pointsJson + ";",
    "const colors = " + colorsJson + ";",
    "",
    "pts.forEach(function(p) {",
    "  var color = colors[(p.dayNum - 1) % colors.length];",
    "  if (p.isSleep) {",
    '    var icon = L.divIcon({ className: "", html: \'<div class="sleep-marker">N</div>\', iconSize: [28, 28], iconAnchor: [14, 14] });',
    "    L.marker([p.lat, p.lng], { icon: icon })",
    "      .bindPopup('<b>' + p.nom + '</b><br>Jour ' + p.dayNum + ' — Nuit ici<br><i>' + p.famille + '</i>')",
    "      .addTo(map);",
    "  } else {",
    '    var icon = L.divIcon({ className: "", html: \'<div class="visit-marker" style="background:\' + color + \'"></div>\', iconSize: [14, 14], iconAnchor: [7, 7] });',
    "    L.marker([p.lat, p.lng], { icon: icon })",
    "      .bindPopup('<b>' + p.nom + '</b><br>Jour ' + p.dayNum + (p.isStay ? ' (séjour)' : '') + '<br><i>' + p.famille + '</i>')",
    "      .addTo(map);",
    "  }",
    "});",
    "",
    "var bounds = pts.map(function(p) { return [p.lat, p.lng]; });",
    "if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });",
  ].join("\n");

  const html = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "<title>Itinéraire " + startName + " → " + endName + "</title>\n" +
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n' +
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n' +
    "<style>\n" +
    "  * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
    "  body { font-family: system-ui, -apple-system, sans-serif; }\n" +
    "  #map { width: 100vw; height: 100vh; }\n" +
    "  .legend { position: fixed; bottom: 20px; left: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 1000; max-height: 60vh; overflow-y: auto; min-width: 200px; }\n" +
    "  .legend h3 { margin-bottom: 10px; font-size: 14px; color: #333; }\n" +
    "  .legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: #555; }\n" +
    "  .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }\n" +
    '  .stay-badge { background: #f39c12; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; }\n' +
    "  .sleep-marker { background: #2c3e50; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }\n" +
    "  .visit-marker { width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }\n" +
    "</style>\n</head>\n<body>\n" +
    '<div id="map"></div>\n' +
    '<div class="legend">\n' +
    "  <h3>Itinéraire " + startName + " → " + endName + "</h3>\n  " +
    legendItems + "\n" +
    '  <div style="margin-top:10px;font-size:12px;color:#888">\n' +
    "    " + itinerary.days.length + " jours · ~" + itinerary.totalDistanceKm + " km · " + visitCount + " visites\n" +
    "  </div>\n" +
    "</div>\n" +
    "<script>\n" + mapScript + "\n</script>\n" +
    "</body>\n</html>";

  const outDir = join(__dirname, "..", "data", "debug");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "itinerary-map.html");
  writeFileSync(outPath, html, "utf-8");
  console.log("\n  Carte generee : " + outPath);
}

main();
