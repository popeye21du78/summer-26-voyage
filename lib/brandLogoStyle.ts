/**
 * Variations couleur marque sur A1.png (proches du dégradé #E07856 → #D4635B → #CD853F).
 * Utilisé par le header et le logo central sur le hero.
 */
export const BRAND_LOGO_FILTER: Record<string, string> = {
  hero: "saturate(1.12) brightness(1.03) hue-rotate(-2deg) drop-shadow(0 2px 10px rgba(224,120,86,0.45))",
  /** Logo central hero — bien visible, teinte terracotta / ambre marque. */
  heroCenter:
    "sepia(0.5) saturate(2.05) hue-rotate(332deg) brightness(1.1) contrast(1.12) drop-shadow(0 10px 36px rgba(224,96,72,0.75))",
  inspiration:
    "saturate(1.18) brightness(1.04) hue-rotate(-8deg) drop-shadow(0 2px 10px rgba(212,99,91,0.4))",
  "mes-voyages":
    "saturate(1.14) brightness(1.02) hue-rotate(4deg) drop-shadow(0 2px 10px rgba(205,133,63,0.42))",
  partages:
    "saturate(1.15) brightness(1.03) hue-rotate(6deg) drop-shadow(0 2px 10px rgba(224,120,86,0.4))",
  stats:
    "saturate(1.12) brightness(1.03) hue-rotate(-4deg) drop-shadow(0 2px 10px rgba(224,120,86,0.38))",
  "on-repart":
    "saturate(1.2) brightness(1.08) hue-rotate(-6deg) drop-shadow(0 2px 12px rgba(255,200,180,0.35))",
  social:
    "saturate(1.18) brightness(1.06) drop-shadow(0 2px 12px rgba(255,220,200,0.3))",
  createur:
    "saturate(1.15) brightness(1.05) hue-rotate(3deg) drop-shadow(0 2px 10px rgba(224,120,86,0.35))",
  philosophie:
    "saturate(1.16) brightness(1.06) drop-shadow(0 2px 10px rgba(255,200,170,0.32))",
  default:
    "saturate(1.12) brightness(1.04) drop-shadow(0 2px 10px rgba(224,120,86,0.4))",
};
