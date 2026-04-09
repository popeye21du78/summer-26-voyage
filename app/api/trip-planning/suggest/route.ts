import { NextResponse } from "next/server";
import { suggestStructures } from "@/lib/trip-engine/suggest";
import type { SuggestInput } from "@/lib/trip-engine/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SuggestInput>;
    if (!body?.mode || !body?.days) {
      return NextResponse.json(
        { ok: false, error: "mode et days requis" },
        { status: 400 }
      );
    }
    const input: SuggestInput = {
      mode: body.mode,
      days: Math.max(1, Math.min(60, Number(body.days))),
      pace: body.pace ?? "equilibre",
      tripForm: body.tripForm ?? "options",
      notoriety: body.notoriety ?? "equilibre",
      priorities: Array.isArray(body.priorities) ? body.priorities : [],
      conflictPriority: body.conflictPriority,
      regionKey: body.regionKey,
      territoryId: body.territoryId,
      axis: body.axis,
      places: body.places,
    };
    const result = suggestStructures(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
