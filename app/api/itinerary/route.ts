import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { scoreLieux, applyProportions, type LieuLigne, type LieuScore } from "@/lib/score-lieux";
import type { ProfilRecherche } from "@/lib/quiz-to-profil";
import { generateItinerary, type ItineraryConfig } from "@/lib/itinerary/generate";
import { corridorFilter, adaptiveCorridorWidth } from "@/lib/itinerary/corridor";

const DB_PATH = join(process.cwd(), "data", "cities", "lieux-central.json");

function findByName(lieux: LieuLigne[], name: string): LieuLigne | undefined {
  const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return lieux.find((l) => {
    const n = (l.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === norm || n.includes(norm);
  });
}

/**
 * POST /api/itinerary
 *
 * Mode 1 (maintenance) : { from, to, nights, rythme }
 *   → score + corridor + proportions + itinerary depuis zero
 *
 * Mode 2 (workflow quiz) : { lieux, start, end, nights, rythme }
 *   → prend les lieux deja selectionnes et genere l'itineraire
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Mode 2 : lieux deja fournis (workflow quiz)
    if (body.lieux && Array.isArray(body.lieux)) {
      return handleFromLieux(body);
    }

    // Mode 1 : from/to (maintenance)
    return handleFromNames(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}

function formatResult(itinerary: ReturnType<typeof generateItinerary>, fromName: string, toName: string) {
  return {
    days: itinerary.days.map((d) => ({
      day: d.day,
      isStayDay: d.isStayDay,
      points: d.points.map((p) => ({
        nom: p.nom,
        lat: p.lat,
        lng: p.lng,
        famille: p.bucketFamille,
        score: p.score,
        departement: p.departement,
      })),
      sleepAt: d.sleepAt ? { nom: d.sleepAt.nom, lat: d.sleepAt.lat, lng: d.sleepAt.lng } : null,
      sleepNights: d.sleepNights,
    })),
    totalDistanceKm: itinerary.totalDistanceKm,
    clustersCount: itinerary.clusters.length,
    totalVisits: itinerary.days.reduce((s, d) => s + (d.isStayDay ? 0 : d.points.length), 0),
    from: fromName,
    to: toName,
  };
}

async function handleFromLieux(body: any) {
  const { lieux, start, end, nights = 7, rythme = "normal" } = body as {
    lieux: LieuScore[];
    start: { lat: number; lng: number };
    end?: { lat: number; lng: number };
    nights?: number;
    rythme?: "cool" | "normal" | "intense";
  };

  if (!start?.lat || !start?.lng) {
    return NextResponse.json({ error: "Point de depart (start) requis" }, { status: 400 });
  }
  if (lieux.length < 2) {
    return NextResponse.json({ error: "Au moins 2 lieux requis" }, { status: 400 });
  }

  const config: ItineraryConfig = {
    start,
    end,
    totalNights: nights,
    rythme,
  };

  const itinerary = generateItinerary(lieux, config);
  const fromName = lieux[0]?.nom ?? "Départ";
  const toName = end ? (lieux[lieux.length - 1]?.nom ?? "Arrivée") : fromName;

  return NextResponse.json(formatResult(itinerary, fromName, toName));
}

async function handleFromNames(body: any) {
  const { from, to, nights = 7, rythme = "normal" } = body as {
    from: string;
    to: string;
    nights?: number;
    rythme?: "cool" | "normal" | "intense";
  };

  const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const lieux: LieuLigne[] = db.lieux || db;

  const fromLieu = findByName(lieux, from);
  if (!fromLieu?.lat || !fromLieu?.lng) {
    return NextResponse.json({ error: `Lieu de depart "${from}" introuvable` }, { status: 400 });
  }
  const startPoint = { lat: Number(fromLieu.lat), lng: Number(fromLieu.lng) };

  let endPoint: { lat: number; lng: number } | undefined;
  if (to) {
    const toLieu = findByName(lieux, to);
    if (toLieu?.lat && toLieu?.lng) {
      endPoint = { lat: Number(toLieu.lat), lng: Number(toLieu.lng) };
    }
  }

  const profil: ProfilRecherche = {
    tagsCadre: [
      { tag: "bord_de_mer", poids: 3 },
      { tag: "montagne", poids: 2 },
      { tag: "campagne", poids: 2 },
    ],
    tagsArchitecture: ["medieval", "roman"],
    famillesIncluses: ["ville", "village", "chateau", "plage", "rando", "site_naturel", "patrimoine", "abbaye"],
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

  const scored = scoreLieux(profil, lieux);

  let pool = scored;
  if (endPoint) {
    const width = adaptiveCorridorWidth(startPoint, endPoint, nights);
    pool = corridorFilter(scored, (l) => ({ lat: Number(l.lat), lng: Number(l.lng) }), startPoint, endPoint, width);
  }

  const targetCount = Math.round((nights + 1) * (rythme === "cool" ? 2.5 : rythme === "intense" ? 4 : 3));
  const selected = applyProportions(pool, profil.proportionsAmbiance!, targetCount, profil);

  const config: ItineraryConfig = {
    start: startPoint,
    end: endPoint,
    totalNights: nights,
    rythme,
  };

  const itinerary = generateItinerary(selected, config);
  return NextResponse.json(formatResult(itinerary, fromLieu.nom, to || fromLieu.nom));
}
