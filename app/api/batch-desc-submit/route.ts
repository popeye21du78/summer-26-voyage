import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/batch-desc-submit?lot=2 — Soumet un lot descriptions à l'API Batch */
export async function POST(req: NextRequest) {
  try {
    const lot = req.nextUrl.searchParams.get("lot");
    const n = lot ? parseInt(lot, 10) : NaN;
    if (Number.isNaN(n) || n < 1) {
      return NextResponse.json({ error: "lot invalide" }, { status: 400 });
    }

    const cwd = process.cwd();
    const cmd = `npx tsx scripts/submit-batch-desc.ts ${n}`;

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, env: process.env, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
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
