import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");
const OUTPUT_DIR = join(process.cwd(), "data", "descriptions");
const PHOTOS_DIR = join(process.cwd(), "photos");
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

function getPhotosFolderCount(): number {
  if (!existsSync(PHOTOS_DIR)) return 0;
  try {
    const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const light = searchParams.get("light") === "1" || searchParams.get("light") === "true";

    const manifestPath = join(BATCH_DIR, "manifest.json");
    if (!existsSync(manifestPath)) {
      return NextResponse.json({
        prepared: false,
        lots: [],
        descriptions: getDescriptionStats(),
        processing: getProcessProgress(),
        photosFolders: getPhotosFolderCount(),
      });
    }

    const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const apiKey = process.env.OPENAI_API_KEY;
    const openai = apiKey ? new OpenAI({ apiKey }) : null;

    const statusMap = new Map<
      number,
      { status: string; completed?: number; total?: number; failed?: number }
    >();

    if (!light && openai) {
      const BATCH_SIZE = 4;
      const DELAY_MS = 300;
      const toFetch: { m: ManifestEntry; batchId: string; hasOutput: boolean }[] = [];
      for (const m of manifest) {
        const idPath = join(BATCH_DIR, `batch_id_lot${m.lot}.txt`);
        const hasOutput = existsSync(join(BATCH_DIR, `batch_output_lot${m.lot}.jsonl`));
        if (existsSync(idPath)) {
          const batchId = readFileSync(idPath, "utf-8").trim();
          if (batchId && !hasOutput) {
            toFetch.push({ m, batchId, hasOutput });
          }
        }
      }
      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        const chunk = toFetch.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          chunk.map(async ({ m, batchId }) => {
            try {
              const batch = await openai!.batches.retrieve(batchId);
              return {
                lot: m.lot,
                status: batch.status,
                completed: batch.request_counts?.completed,
                total: batch.request_counts?.total,
                failed: batch.request_counts?.failed,
              };
            } catch {
              return { lot: m.lot, status: "unknown" as const };
            }
          })
        );
        for (const r of results) statusMap.set(r.lot, r);
        if (i + BATCH_SIZE < toFetch.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }

    const lots: LotStatus[] = manifest.map((m) => {
      const idPath = join(BATCH_DIR, `batch_id_lot${m.lot}.txt`);
      const hasOutput = existsSync(join(BATCH_DIR, `batch_output_lot${m.lot}.jsonl`));
      let batchId: string | null = null;
      let status = "not_submitted";
      let completed: number | undefined;
      let total: number | undefined;
      let failed: number | undefined;

      if (existsSync(idPath)) {
        batchId = readFileSync(idPath, "utf-8").trim();
        if (hasOutput) {
          status = "completed";
          completed = m.requests;
          total = m.requests;
        } else {
          const fetched = statusMap.get(m.lot);
          if (fetched) {
            status = fetched.status;
            completed = fetched.completed;
            total = fetched.total;
            failed = fetched.failed;
          } else if (batchId) {
            status = "submitted";
          }
        }
      }

      return {
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
      };
    });

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
      photosFolders: getPhotosFolderCount(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
