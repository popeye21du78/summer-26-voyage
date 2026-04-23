/**
 * Réduit une image navigateur (data URL ou blob URL) pour le stockage local.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<string> {
  const drawToDataUrl = (
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ) => {
    const ratio = Math.min(1, maxWidth / width);
    const w = Math.round(width * ratio);
    const h = Math.round(height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    draw(ctx, w, h);
    return new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("toBlob"));
            return;
          }
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    });
  };

  try {
    const bitmap = await createImageBitmap(file);
    const out = await drawToDataUrl(bitmap.width, bitmap.height, (ctx, w, h) => {
      ctx.drawImage(bitmap, 0, 0, w, h);
    });
    bitmap.close();
    return out;
  } catch {
    // iOS/Safari: createImageBitmap peut échouer (HEIC/photothèque).
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("img-load"));
      el.src = objectUrl;
    });
    return await drawToDataUrl(img.naturalWidth || img.width, img.naturalHeight || img.height, (ctx, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
    });
  } catch {
    // Dernier filet: conserver le fichier tel quel en data URL.
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
