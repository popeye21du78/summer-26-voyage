/** Luminance 0–1 d’un pixel (xPct/yPct en %) sur une image (data URL ou http). */
export function sampleLuminanceFromSrc(
  src: string,
  xPct: number,
  yPct: number,
  onResult: (lum: number) => void
): void {
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      const w = 56;
      c.width = w;
      c.height = w;
      const ctx = c.getContext("2d");
      if (!ctx) {
        onResult(0.35);
        return;
      }
      ctx.drawImage(img, 0, 0, w, w);
      const xf = Math.min(0.92, Math.max(0.08, xPct / 100));
      const yf = Math.min(0.92, Math.max(0.08, yPct / 100));
      const x = Math.floor(xf * (w - 1));
      const y = Math.floor(yf * (w - 1));
      const d = ctx.getImageData(x, y, 1, 1).data;
      onResult((0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255);
    } catch {
      onResult(0.35);
    }
  };
  img.onerror = () => onResult(0.35);
  img.src = src;
}
