"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Signature discrète du logo Viago en haut-droit de chaque page de l'app.
 * - Colorisée via un masque CSS + gradient accent (chaud, dans la charte)
 * - Pointer-events none : purement décoratif, ne bloque pas les clics
 * - Masquée sur l'accueil (le logo hero y est déjà très présent)
 * - Masquée sur la carte inspirer plein écran pour ne pas gêner la lecture géo
 */
export default function AppLogoSignature() {
  const pathname = usePathname() || "";
  const onAccueil = pathname === "/accueil" || pathname === "/";
  const onInspirerCarte = pathname.startsWith("/inspirer");

  if (onAccueil) return null;

  return (
    <div
      className="pointer-events-none fixed z-[30] select-none"
      style={{
        /** Au-dessus de la bottom nav, alignée à droite, en signature discrète. */
        bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
        right: "14px",
        opacity: onInspirerCarte ? 0.18 : 0.32,
      }}
      aria-hidden
    >
      <div
        className="relative h-6 w-6"
        style={{
          WebkitMaskImage: "url(/A1.png)",
          maskImage: "url(/A1.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          background:
            "linear-gradient(135deg, var(--color-accent-start), var(--color-accent-mid, var(--color-accent-start)), var(--color-accent-end))",
          filter: "drop-shadow(0 2px 6px rgba(224,120,86,0.35))",
        }}
      />
      <noscript>
        <Image src="/A1.png" alt="Viago" width={24} height={24} />
      </noscript>
    </div>
  );
}
