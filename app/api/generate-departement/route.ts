import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/generate-departement
 * Lance le script CLI generate-departement.ts en sous-processus.
 * Le script gère tout : purge, GPT-4o, Excel, enrichissement + retry EBUSY.
 */
export async function POST(req: NextRequest) {
  try {
    const { codeDep } = (await req.json()) as { codeDep: string };
    if (!codeDep || !/^\d{1,3}$/.test(codeDep)) {
      return NextResponse.json({ error: "codeDep invalide" }, { status: 400 });
    }

    const cwd = process.cwd();
    const cmd = `npx tsx scripts/generate-departement.ts ${codeDep}`;

    const output = await new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd, timeout: 300_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
        } else {
          resolve(stdout);
        }
      });
    });

    return NextResponse.json({ success: true, output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
