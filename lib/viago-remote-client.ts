import type { ViagoStepContent } from "@/lib/viago-storage";
import { getViagoStorageKey } from "@/lib/viago-storage";

export function isViagoRemoteEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export async function uploadViagoFile(
  file: File,
  voyageId: string,
  stepId: string,
  kind: "polaroid" | "hero" = "polaroid"
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("voyageId", voyageId);
  fd.append("stepId", stepId);
  fd.append("kind", kind);
  const r = await fetch("/api/viago/upload", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Upload impossible");
  }
  const { url } = (await r.json()) as { url: string };
  return url;
}

export async function getViagoStepFromApi(
  voyageId: string,
  stepId: string
): Promise<ViagoStepContent | null> {
  const encV = encodeURIComponent(voyageId);
  const encS = encodeURIComponent(stepId);
  const r = await fetch(`/api/viago/step/${encV}/${encS}`, { credentials: "same-origin" });
  if (r.status === 404) return null;
  if (r.status === 503) return null;
  if (!r.ok) return null;
  const j = (await r.json()) as { content: ViagoStepContent };
  return j.content;
}

export async function putViagoStepToApi(
  voyageId: string,
  stepId: string,
  content: ViagoStepContent
): Promise<ViagoStepContent> {
  const encV = encodeURIComponent(voyageId);
  const encS = encodeURIComponent(stepId);
  const r = await fetch(`/api/viago/step/${encV}/${encS}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ content }),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Enregistrement serveur impossible");
  }
  const j = (await r.json()) as { content: ViagoStepContent };
  return j.content;
}

export function clearLocalViagoCache(
  voyageId: string,
  stepId: string,
  storageScope?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getViagoStorageKey(voyageId, stepId, storageScope));
    window.localStorage.removeItem(getViagoStorageKey(voyageId, stepId, null));
  } catch {
    /* ignore */
  }
}
