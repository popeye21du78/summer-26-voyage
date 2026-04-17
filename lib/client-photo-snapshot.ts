import { mergeRuntimeValidationUrls } from "@/lib/public-photo-client";

/**
 * Hydrate le client avec toutes les validations maintenance (fichier + Supabase)
 * via un seul GET — fusionné dans la résolution photo côté `public-photo-client`.
 */
let snapshotFetchDone = false;
let inflight: Promise<void> | null = null;

export function ingestPhotoValidationSnapshot(bySlug: Record<string, string[]>) {
  if (!bySlug || typeof bySlug !== "object") return;
  mergeRuntimeValidationUrls(bySlug);
}

export async function loadPhotoValidationSnapshot(): Promise<void> {
  if (typeof window === "undefined") return;
  if (snapshotFetchDone) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const r = await fetch("/api/photo-validations-snapshot", { credentials: "same-origin" });
      if (r.ok) {
        const data = (await r.json()) as { bySlug?: Record<string, string[]> };
        if (data?.bySlug && typeof data.bySlug === "object") {
          ingestPhotoValidationSnapshot(data.bySlug);
        }
      }
    } catch {
      /* réseau / hors ligne */
    } finally {
      snapshotFetchDone = true;
      inflight = null;
    }
  })();

  return inflight;
}
