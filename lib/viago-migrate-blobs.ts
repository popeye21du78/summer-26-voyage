import type { ViagoStepContent, ViagoPhotoItem } from "@/lib/viago-storage";

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  if (dataUrl.startsWith("data:") && typeof fetch === "function") {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  }
  return new File([], filename, { type: "image/jpeg" });
}

/**
 * Remplace les data URL par des URLs https via upload (une fois par ressource).
 */
export async function ensureHttpsForViagoContent(
  content: ViagoStepContent,
  uploadFile: (file: File, role: "polaroid" | "hero") => Promise<string>
): Promise<ViagoStepContent> {
  let nextPhotos: ViagoPhotoItem[] = content.photos;
  for (let i = 0; i < nextPhotos.length; i++) {
    const u = nextPhotos[i]!.url;
    if (u.startsWith("data:")) {
      const file = await dataUrlToFile(u, `viago-${i}.jpg`);
      const url = await uploadFile(file, "polaroid");
      nextPhotos = nextPhotos.map((p, j) => (j === i ? { ...p, url } : p));
    }
  }
  let hero: string | null | undefined = content.heroPhotoUrl;
  if (typeof hero === "string" && hero.startsWith("data:")) {
    const file = await dataUrlToFile(hero, "hero.jpg");
    hero = await uploadFile(file, "hero");
  }
  return {
    ...content,
    photos: nextPhotos,
    heroPhotoUrl: hero,
  };
}
