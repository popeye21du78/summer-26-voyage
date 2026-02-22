import { NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/batch-download-all — Télécharge tous les lots et fusionne */
export async function POST() {
  try {
    const cwd = process.cwd();
    const cmd = "npx tsx scripts/download-batch-results.ts";

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, env: process.env, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || stdout || error.message));
        else resolve(stdout);
      });
    });

    return NextResponse.json({ success: true, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
