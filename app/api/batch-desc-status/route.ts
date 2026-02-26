import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");
const OUTPUT_DIR = join(process.cwd(), "data", "descriptions");
const PROGRESS_PATH = join(BATCH_DIR, ".process-desc-progress.json");

export const dynamic = "force-dynamic";

interface ManifestEntry {
  lot: number;
  id: string;
  label: string;
  file: string;
  requests: number;
}

interface LotStatus {
  lot: number;
  id: string;
  label: string;
  requests: number;
  batchId: string | null;
  status: "not_submitted" | string;
  completed?: number;
  total?: number;
  failed?: number;
  hasOutput: boolean;
}

function getProcessProgress(): Record<string, unknown> | null {
  if (!existsSync(PROGRESS_PATH)) return null;
  try {
    const raw = readFileSync(PROGRESS_PATH, "utf-8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getDescriptionStats(): { total: number; raw: number; fixed: number } {
  if (!existsSync(OUTPUT_DIR)) return { total: 0, raw: 0, fixed: 0 };
  const files = readdirSync(OUTPUT_DIR);
  const raw = files.filter((f) => f.endsWith("-raw.txt")).length;
  const fixed = files.filter((f) => f.endsWith("-raw-fixed.txt")).length;
  return { total: raw, raw: raw - fixed, fixed };
}

export async function GET() {
  try {
    const manifestPath = join(BATCH_DIR, "manifest.json");
    if (!existsSync(manifestPath)) {
      return NextResponse.json({
        prepared: false,
        lots: [],
        descriptions: { total: 0, raw: 0, fixed: 0 },
        processing: null,
      });
    }

    const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const apiKey = process.env.OPENAI_API_KEY;
    const openai = apiKey ? new OpenAI({ apiKey }) : null;

    const lots: LotStatus[] = [];

    for (const m of manifest) {
      const idPath = join(BATCH_DIR, `batch_id_lot${m.lot}.txt`);
      const hasOutput = existsSync(join(BATCH_DIR, `batch_output_lot${m.lot}.jsonl`));
      let batchId: string | null = null;
      let status: string = "not_submitted";
      let completed: number | undefined;
      let total: number | undefined;
      let failed: number | undefined;

      if (existsSync(idPath)) {
        batchId = readFileSync(idPath, "utf-8").trim();
        if (openai && batchId) {
          try {
            const batch = await openai.batches.retrieve(batchId);
            status = batch.status;
            completed = batch.request_counts?.completed;
            total = batch.request_counts?.total;
            failed = batch.request_counts?.failed;
          } catch {
            status = "unknown";
          }
        } else {
          status = "submitted";
        }
      }

      lots.push({
        lot: m.lot,
        id: m.id,
        label: m.label,
        requests: m.requests,
        batchId,
        status,
        completed,
        total,
        failed,
        hasOutput,
      });
    }

    const totalRequests = manifest.reduce((s, m) => s + m.requests, 0);
    const completedRequests = lots.reduce((s, l) => s + (l.completed ?? 0), 0);
    const submittedLots = lots.filter((l) => l.status !== "not_submitted").length;
    const completedLots = lots.filter((l) => l.status === "completed").length;
    const downloadedLots = lots.filter((l) => l.hasOutput).length;

    const costPerInputToken = 2.0 / 1_000_000 * 0.5;
    const costPerOutputToken = 8.0 / 1_000_000 * 0.5;
    const avgInputPerReq = 3500;
    const avgOutputPerReq = 2000;
    const estimatedCostPerReq = avgInputPerReq * costPerInputToken + avgOutputPerReq * costPerOutputToken;
    const estimatedTotalCost = totalRequests * estimatedCostPerReq;
    const estimatedSpentSoFar = completedRequests * estimatedCostPerReq;

    return NextResponse.json({
      prepared: true,
      lots,
      summary: {
        totalLots: manifest.length,
        totalRequests,
        submittedLots,
        completedLots,
        downloadedLots,
        completedRequests,
      },
      cost: {
        estimated: Math.round(estimatedTotalCost * 100) / 100,
        spent: Math.round(estimatedSpentSoFar * 100) / 100,
      },
      descriptions: getDescriptionStats(),
      processing: getProcessProgress(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
