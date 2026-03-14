import { NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const PHOTOS_DIR = join(process.cwd(), "photos");
const CACHE_FILE = join(process.cwd(), "data", "wikimedia-status.json");

export const dynamic = "force-dynamic";

/** Lit le cache mis à jour par le batch (rapide). Fallback: scan complet si cache absent ou JSON tronqué. */
function readCachedStatus(): { total: number; done: number; remaining: number } | null {
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = readFileSync(CACHE_FILE, "utf-8");
      if (!raw?.trim()) return null;
      try {
        const data = JSON.parse(raw) as { total?: number; done?: number; remaining?: number };
        if (data && typeof data.total === "number" && typeof data.done === "number") {
          return {
            total: data.total,
            done: data.done,
            remaining: Math.max(0, data.total - data.done),
          };
        }
      } catch {
        /* JSON tronqué (batch en cours d'écriture) */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** API : statut Wikimedia Commons. Utilise le cache si présent (instantané), sinon scan. */
export async function GET() {
  try {
    const cached = readCachedStatus();
    if (cached) return NextResponse.json(cached);

    if (!existsSync(PHOTOS_DIR)) {
      return NextResponse.json({ total: 0, done: 0, remaining: 0 });
    }
    const entries = readdirSync(PHOTOS_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const total = dirs.length;
    let done = 0;
    for (const d of dirs) {
      if (existsSync(join(PHOTOS_DIR, d.name, "commons-candidates.json"))) done++;
    }
    return NextResponse.json({ total, done, remaining: total - done });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
