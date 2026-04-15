import type { CommonsPhoto } from "@/lib/commons-api";

/** Métadonnées minimales pour enregistrer une URL validée hors flux Commons. */
export function minimalCommonsPhoto(url: string, title: string): CommonsPhoto {
  const now = new Date().toISOString();
  return {
    url,
    sourceUrl: url,
    title: title.slice(0, 300) || "Photo",
    width: 1200,
    height: 800,
    size: 0,
    timestamp: now,
    author: "",
    license: "",
    licenseUrl: "",
    score: 0,
  };
}
