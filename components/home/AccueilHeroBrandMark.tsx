"use client";

import Image from "next/image";

/**
 * Deuxième emplacement A1 — plus grand, filtre défini dans styles/theme.css (--logo-filter-hero-center).
 */
export default function AccueilHeroBrandMark() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[40%] z-[8] w-[min(110vw,42rem)] -translate-x-1/2 -translate-y-1/2 opacity-[0.98] sm:top-[38%]"
      aria-hidden
    >
      <div className="relative aspect-[2.35/1] w-full">
        <Image
          src="/A1.png"
          alt=""
          fill
          sizes="(max-width: 640px) 110vw, 42rem"
          className="object-contain object-center"
          style={{ filter: "var(--logo-filter-hero-center)" }}
          priority
        />
      </div>
    </div>
  );
}
