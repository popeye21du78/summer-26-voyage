"use client";

import type { CSSProperties } from "react";

/**
 * Logo Viago colorisé via masque CSS.
 *
 * Principe : le PNG (A1, A4 ou A5) sert de MASQUE d'alpha. Les pixels visibles
 * du PNG deviennent peints par `background` — ici le gradient accent Viago —
 * sans que le rectangle du fond ne prenne la couleur. On peut ainsi recolorer
 * dynamiquement les logos noirs fournis en entrée sans jamais retoucher les assets.
 *
 * `variant` :
 * - "mark"  → A5.png (le V simple) — à utiliser pour les petits placements (nav, filigrane, badge)
 * - "full"  → A4.png (logo + wordmark) — placements plus importants (hero, entête section)
 * - "mono"  → A1.png (mono lineart) — à réserver aux placements éditoriaux / décoratifs
 *
 * `tone` :
 * - "accent"     → gradient accent chaud (par défaut)
 * - "neutral"    → texte secondaire discret (signature)
 * - "inverse"    → blanc pur (sur fond accent)
 * - "onDark"     → blanc légèrement transparent (hero sombre)
 * - "accentSoft" → tons accent mais plus tamisés (signature d'une carte)
 */
export type BrandLogoVariant = "mark" | "full" | "mono";
export type BrandLogoTone =
  | "accent"
  | "neutral"
  | "inverse"
  | "onDark"
  | "accentSoft";

type Props = {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  size?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

const MASK_URL: Record<BrandLogoVariant, string> = {
  mark: "url(/A5.png)",
  full: "url(/A4.png)",
  mono: "url(/A1.png)",
};

const TONE_BACKGROUND: Record<BrandLogoTone, string> = {
  accent:
    "linear-gradient(135deg, var(--color-accent-start), var(--color-accent-mid, var(--color-accent-start)), var(--color-accent-end))",
  accentSoft:
    "linear-gradient(135deg, color-mix(in srgb, var(--color-accent-start) 80%, transparent), color-mix(in srgb, var(--color-accent-end) 60%, transparent))",
  neutral: "color-mix(in srgb, var(--color-text-primary) 55%, transparent)",
  inverse: "#FFFFFF",
  onDark: "rgba(255, 255, 255, 0.82)",
};

/**
 * Largeur par défaut selon variant — pour que "full" ne soit pas aussi carré
 * que la variante "mark". Les assets ont des ratios différents.
 */
const VARIANT_ASPECT: Record<BrandLogoVariant, number> = {
  mark: 1,
  full: 2.8,
  mono: 2.6,
};

export default function BrandLogo({
  variant = "mark",
  tone = "accent",
  size = 24,
  className = "",
  style,
  ariaLabel,
}: Props) {
  const width = Math.round(size * VARIANT_ASPECT[variant]);
  const height = size;
  return (
    <span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        width,
        height,
        WebkitMaskImage: MASK_URL[variant],
        maskImage: MASK_URL[variant],
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        background: TONE_BACKGROUND[tone],
        ...style,
      }}
    />
  );
}
