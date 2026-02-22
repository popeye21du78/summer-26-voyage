import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import * as XLSX from "xlsx";

const BATCH_DIR = join(process.cwd(), "data", "batch");
const CITIES_DIR = join(process.cwd(), "data", "cities");
const XLSX_PATH = join(CITIES_DIR, "lieux-central.xlsx");
const OUTPUT_PATH = join(BATCH_DIR, "batch_output.jsonl");
const ENRICH_PROGRESS_PATH = join(CITIES_DIR, ".enrich-progress.json");
const PROCESS_PROGRESS_PATH = join(CITIES_DIR, ".process-progress.json");

export const dynamic = "force-dynamic";

function getPipelineStatus() {
  const hasBatchOutput = existsSync(OUTPUT_PATH);
  let batchOutputLines = 0;
  if (hasBatchOutput) {
    try {
      batchOutputLines = readFileSync(OUTPUT_PATH, "utf-8").trim().split("\n").filter(Boolean).length;
    } catch {
      //
    }
  }

  const hasExcel = existsSync(XLSX_PATH);
  let excelStats = { patrimoine: 0, plages: 0, randos: 0, hasLatLng: false };
  if (hasExcel) {
    try {
      const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
      for (const name of ["Patrimoine", "Plages", "Randos"] as const) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        const count = Math.max(0, rows.length - 1);
        if (name === "Patrimoine") excelStats.patrimoine = count;
        else if (name === "Plages") excelStats.plages = count;
        else excelStats.randos = count;
      }
      const sheetPat = wb.Sheets["Patrimoine"];
      if (sheetPat) {
        const rows = XLSX.utils.sheet_to_json(sheetPat, { header: 1 }) as unknown[][];
        const header = (rows[0] as string[]) || [];
        const latIdx = header.indexOf("lat");
        if (latIdx >= 0 && rows.length > 1) {
          const firstRow = rows[1] as unknown[];
          excelStats.hasLatLng = !!firstRow[latIdx];
        }
      }
    } catch {
      //
    }
  }

  let processInProgress: {
    current: number;
    total: number;
    lastDep: string;
    currentDep?: string;
    errors?: Array<{ dep: string; message: string }>;
  } | null = null;
  if (existsSync(PROCESS_PROGRESS_PATH)) {
    try {
      const raw = readFileSync(PROCESS_PROGRESS_PATH, "utf-8");
      const parsed = JSON.parse(raw) as {
        current?: number;
        total?: number;
        lastDep?: string;
        currentDep?: string;
        errors?: Array<{ dep: string; message: string }>;
      };
      if (typeof parsed?.current === "number" && typeof parsed?.total === "number") {
        processInProgress = {
          current: parsed.current,
          total: parsed.total,
          lastDep: parsed.lastDep ?? "",
          currentDep: parsed.currentDep,
          errors: Array.isArray(parsed.errors) ? parsed.errors : undefined,
        };
      }
    } catch {
      //
    }
  }

  let enrichInProgress: { sheet: string; current: number; total: number } | null = null;
  if (existsSync(ENRICH_PROGRESS_PATH)) {
    try {
      const raw = readFileSync(ENRICH_PROGRESS_PATH, "utf-8");
      const parsed = JSON.parse(raw) as { sheet?: string; current?: number; total?: number };
      if (parsed?.sheet && typeof parsed.current === "number" && typeof parsed.total === "number") {
        enrichInProgress = {
          sheet: parsed.sheet,
          current: parsed.current,
          total: parsed.total,
        };
      }
    } catch {
      //
    }
  }

  return {
    process: {
      hasBatchOutput,
      batchOutputLines,
      hasExcel,
      excelStats,
      inProgress: processInProgress,
    },
    enrich: {
      done: hasExcel && excelStats.hasLatLng && excelStats.patrimoine > 0,
      inProgress: enrichInProgress,
    },
  };
}

/** GET /api/batch-status — Statut lots batch + pipeline (process, enrich) */
export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
    }

    const batches: Array<{
      part: number;
      batch_id: string;
      status: string;
      completed?: number;
      total?: number;
      failed?: number;
    }> = [];

    const openai = new OpenAI({ apiKey });

    for (let p = 1; p <= 4; p++) {
      const idPath = join(BATCH_DIR, `batch_id_part${p}.txt`);
      if (!existsSync(idPath)) continue;

      const batchId = readFileSync(idPath, "utf-8").trim();
      const batch = await openai.batches.retrieve(batchId);

      batches.push({
        part: p,
        batch_id: batch.id,
        status: batch.status,
        completed: batch.request_counts?.completed,
        total: batch.request_counts?.total,
        failed: batch.request_counts?.failed,
      });
    }

    const pipeline = getPipelineStatus();

    return NextResponse.json(
      { batches, pipeline },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
