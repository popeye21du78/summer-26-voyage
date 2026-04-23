"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";

/**
 * Signature discrète du logo Viago en bas-droite de chaque page de l'app.
 * - Utilise `BrandLogo` → mask CSS + gradient accent (dynamique avec le moodboard)
 * - Pointer-events none : purement décoratif, ne bloque pas les clics
 * - Masquée sur l'accueil (le logo hero y est déjà très présent)
 * - Plus discrète sur la carte inspirer (ne gêne pas la lecture géo)
 */
export default function AppLogoSignature() {
  const pathname = usePathname() || "";
  const onAccueil = pathname === "/accueil" || pathname === "/";
  const onInspirerCarte = pathname.startsWith("/inspirer");

  if (onAccueil) return null;

  /**
   * Signature plus affirmée qu'avant — l'user a explicitement demandé
   * « le logo doit être intégré dans des endroits stratégiques » et ne le voyait
   * nulle part. On passe à 32px + opacité ≥ 55 % + un halo accent doux
   * qui rappelle l'identité de marque sans concurrencer la lecture.
   */
  return (
    <div
      className="pointer-events-none fixed z-[30] select-none"
      style={{
        bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
        right: "14px",
        opacity: onInspirerCarte ? 0.55 : 0.78,
        filter:
          "drop-shadow(0 2px 6px rgba(0,0,0,0.35)) drop-shadow(0 0 14px color-mix(in srgb, var(--color-accent-start) 35%, transparent))",
      }}
      aria-hidden
    >
      <BrandLogo variant="mark" tone="accent" size={32} />
    </div>
  );
}
