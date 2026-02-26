import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/batch-desc-download?lot=1 — Télécharge les résultats d'un lot */
export async function POST(req: NextRequest) {
  try {
    const lotArg = req.nextUrl.searchParams.get("lot");
    const n = lotArg ? parseInt(lotArg, 10) : NaN;
    if (Number.isNaN(n) || n < 1) {
      return NextResponse.json({ error: "lot invalide" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
    }

    const idPath = join(BATCH_DIR, `batch_id_lot${n}.txt`);
    if (!existsSync(idPath)) {
      return NextResponse.json({ error: `Lot ${n} non soumis (batch_id introuvable)` }, { status: 404 });
    }

    const batchId = readFileSync(idPath, "utf-8").trim();
    const openai = new OpenAI({ apiKey });
    const batch = await openai.batches.retrieve(batchId);

    if (batch.status !== "completed") {
      return NextResponse.json(
        { error: `Lot ${n} non terminé (statut: ${batch.status})` },
        { status: 400 }
      );
    }

    if (!batch.output_file_id) {
      return NextResponse.json({ error: "Pas de fichier de sortie" }, { status: 500 });
    }

    const response = await openai.files.content(batch.output_file_id);
    const content = await response.text();

    mkdirSync(BATCH_DIR, { recursive: true });
    const outPath = join(BATCH_DIR, `batch_output_lot${n}.jsonl`);
    writeFileSync(outPath, content, "utf-8");

    const lines = content.trim().split("\n").filter(Boolean).length;

    return NextResponse.json({
      success: true,
      output: `✓ Lot ${n} téléchargé : ${lines} réponses → batch_output_lot${n}.jsonl`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
