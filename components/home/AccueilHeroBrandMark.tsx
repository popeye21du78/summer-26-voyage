"use client";

/**
 * Filigrane logo Viago au centre du hero d'Accueil.
 *
 * Rendu via masque CSS : le PNG A4 (logo + wordmark) sert de masque d'alpha,
 * et c'est le gradient accent qui est peint dessous. Le logo n'est donc plus
 * jamais noir — il prend la couleur de l'accent de l'ambiance active.
 */
export default function AccueilHeroBrandMark() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[38%] z-[8] -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <div
        className="w-[min(82vw,30rem)]"
        style={{
          aspectRatio: "2.8 / 1",
          WebkitMaskImage: "url(/A4.png)",
          maskImage: "url(/A4.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          background:
            "linear-gradient(135deg, var(--color-accent-start), var(--color-accent-mid, var(--color-accent-start)), var(--color-accent-end))",
          filter:
            "drop-shadow(0 14px 42px color-mix(in srgb, var(--color-accent-start) 52%, transparent))",
          opacity: 0.95,
        }}
      />
    </div>
  );
}
