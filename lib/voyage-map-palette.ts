/**
 * Couleurs carte / UI alignées sur l’accueil (carousel « Laissez-vous tenter », titres, CTA).
 * Réutilisable pour la carte inspiration et ailleurs.
 */
export const VOYAGE_UI = {
  terracotta: "var(--color-accent-end)",
  terracottaDark: "var(--color-accent-deep)",
  coral: "var(--color-accent-start)",
  coralDeep: "var(--color-accent-mid)",
  sand: "var(--color-accent-gold)",
  cream: "#FFF2EB",
} as const;

/** Bordures entre régions : cycle orange / corail / sable (tons marque). */
export const REGION_BORDER_CYCLE = [
  VOYAGE_UI.coral,
  VOYAGE_UI.coralDeep,
  VOYAGE_UI.sand,
  VOYAGE_UI.terracotta,
  "#E8A87C",
  "#C4704A",
  "#F4A688",
] as const;

/** Remplissages région : plus saturés que le fond, dynamiques, cohérents terracotta. */
export function vividFillHex(index: number, total: number): string {
  const t = total > 1 ? index / Math.max(1, total - 1) : 0;
  const h = 14 + t * 38;
  const s = 72 + (index % 4) * 3;
  const l = 54 + (index % 7);
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const S = Math.max(0, Math.min(100, s)) / 100;
  const L = Math.max(0, Math.min(100, l)) / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  const H = ((h % 360) + 360) % 360;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (H < 60) {
    r1 = C;
    g1 = X;
  } else if (H < 120) {
    r1 = X;
    g1 = C;
  } else if (H < 180) {
    g1 = C;
    b1 = X;
  } else if (H < 240) {
    g1 = X;
    b1 = C;
  } else if (H < 300) {
    r1 = X;
    b1 = C;
  } else {
    r1 = C;
    b1 = X;
  }
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return `#${[r, g, b]
    .map((x) =>
      Math.max(0, Math.min(255, x))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

export function borderHexForRegionIndex(i: number): string {
  return REGION_BORDER_CYCLE[i % REGION_BORDER_CYCLE.length];
}
