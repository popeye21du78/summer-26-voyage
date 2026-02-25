/**
 * POST /api/score-lieux
 * Reçoit un ProfilRecherche, charge les lieux depuis lieux-central.json,
 * les score et retourne la liste triée par pertinence.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { scoreLieux, type LieuLigne } from "../../../lib/score-lieux";
import type { ProfilRecherche } from "../../../lib/quiz-to-profil";

const JSON_PATH = path.join(process.cwd(), "data", "cities", "lieux-central.json");

function loadLieuxFromJson(): LieuLigne[] {
  try {
    if (!fs.existsSync(JSON_PATH)) return [];
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const data = JSON.parse(raw) as { lieux?: LieuLigne[] };
    const lieux = Array.isArray(data.lieux) ? data.lieux : [];
    return lieux.filter((l) => {
      const lat = typeof l.lat === "number" ? l.lat : parseFloat(String(l.lat || ""));
      const lng = typeof l.lng === "number" ? l.lng : parseFloat(String(l.lng || ""));
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });
  } catch (e) {
    console.warn("loadLieuxFromJson:", e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profil = body.profil as ProfilRecherche | undefined;
    if (!profil || typeof profil !== "object") {
      return NextResponse.json(
        { error: "profil requis (ProfilRecherche)" },
        { status: 400 }
      );
    }

    const lieux = loadLieuxFromJson();
    const scored = scoreLieux(profil, lieux);

    return NextResponse.json({
      lieux: scored,
      total: scored.length,
    });
  } catch (e) {
    console.error("POST /api/score-lieux:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
