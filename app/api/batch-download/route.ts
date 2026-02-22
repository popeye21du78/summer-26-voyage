import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/batch-download?part=1 — Télécharge les résultats d'un lot */
export async function POST(req: NextRequest) {
  try {
    const part = req.nextUrl.searchParams.get("part");
    const p = part ? parseInt(part, 10) : NaN;
    if (Number.isNaN(p) || p < 1 || p > 4) {
      return NextResponse.json({ error: "part invalide (1-4)" }, { status: 400 });
    }

    const cwd = process.cwd();
    const cmd = `npx tsx scripts/download-batch-results.ts ${p}`;

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, env: process.env, timeout: 60_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
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
