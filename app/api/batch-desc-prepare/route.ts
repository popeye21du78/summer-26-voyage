import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/batch-desc-prepare?model=gpt-4.1 — Prépare les fichiers JSONL */
export async function POST(req: NextRequest) {
  try {
    const model = req.nextUrl.searchParams.get("model") ?? "gpt-4.1";
    const cwd = process.cwd();
    const cmd = `npx tsx scripts/prepare-batch-descriptions.ts --model ${model}`;

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, env: process.env, timeout: 60_000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || stdout || error.message));
        else resolve(stdout);
      });
    });

    return NextResponse.json({ success: true, output });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
