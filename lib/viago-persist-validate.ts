import type { ViagoStepContent } from "@/lib/viago-storage";

const MAX_DATA_URL_CHARS = 120_000;

function isAllowedImageUrl(url: string): boolean {
  const u = url.trim();
  if (u.startsWith("https://")) return true;
  if (u.startsWith("http://") && process.env.NODE_ENV !== "production") return true;
  return false;
}

/**
 * Fichier trop gros côté client en data URL = refus côté serveur (favoriser l’upload Storage).
 */
export function assertPersistableViagoContent(
  c: ViagoStepContent
): { ok: true } | { ok: false; error: string } {
  for (const p of c.photos ?? []) {
    const u = p.url?.trim() ?? "";
    if (!u) return { ok: false, error: "Photo sans URL" };
    if (u.startsWith("data:") && u.length > MAX_DATA_URL_CHARS) {
      return {
        ok: false,
        error: "Image trop lourde pour l’enregistrement. Utilise l’import qui envoie sur le stockage en ligne.",
      };
    }
    if (u.startsWith("data:")) {
      return {
        ok: false,
        error: "Enregistrement serveur : ajoute la photo via le flux qui envoie l’image (plus de place locale).",
      };
    }
    if (!isAllowedImageUrl(u)) {
      return { ok: false, error: "URL d’image non autorisée (HTTPS requis en production)" };
    }
  }
  const h = c.heroPhotoUrl?.trim();
  if (h) {
    if (h.startsWith("data:")) {
      return { ok: false, error: "Image colonne : même chose, uploader d’abord (HTTPS)." };
    }
    if (!isAllowedImageUrl(h)) {
      return { ok: false, error: "URL hero invalide" };
    }
  }
  return { ok: true };
}
