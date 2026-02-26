import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST /api/batch-desc-process?lot=1&validate=true&photos=true */
export async function POST(req: NextRequest) {
  try {
    const lotArg = req.nextUrl.searchParams.get("lot") ?? "all";
    const validate = req.nextUrl.searchParams.get("validate") === "true";
    const photos = req.nextUrl.searchParams.get("photos") === "true";

    const flags = [lotArg];
    if (validate) flags.push("--validate");
    if (photos) flags.push("--photos");

    const cwd = process.cwd();
    const cmd = `npx tsx scripts/process-batch-descriptions.ts ${flags.join(" ")}`;

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, env: process.env, timeout: 300_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
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
