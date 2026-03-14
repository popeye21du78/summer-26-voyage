import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const BATCH_DIR = join(process.cwd(), "data", "batch-desc");
const OUTPUT_DIR = join(process.cwd(), "data", "descriptions");
const PHOTOS_DIR = join(process.cwd(), "photos");
const PROGRESS_PATH = join(BATCH_DIR, ".process-desc-progress.json");

export const dynamic = "force-dynamic";

/** API minimaliste : uniquement descriptions, processing, photos. Pas de manifest, pas d'OpenAI. */
export async function GET() {
  try {
    const descriptions = (() => {
      if (!existsSync(OUTPUT_DIR)) return { total: 0, raw: 0, fixed: 0 };
      const files = readdirSync(OUTPUT_DIR);
      const raw = files.filter((f) => f.endsWith("-raw.txt")).length;
      const fixed = files.filter((f) => f.endsWith("-raw-fixed.txt")).length;
      return { total: raw, raw: raw - fixed, fixed };
    })();

    const processing = (() => {
      if (!existsSync(PROGRESS_PATH)) return null;
      try {
        const raw = readFileSync(PROGRESS_PATH, "utf-8").trim();
        if (!raw) return null;
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();

    const photosFolders = (() => {
      if (!existsSync(PHOTOS_DIR)) return 0;
      try {
        const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
        return entries.filter((e) => e.isDirectory()).length;
      } catch {
        return 0;
      }
    })();

    return NextResponse.json({
      descriptions,
      processing,
      photosFolders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
