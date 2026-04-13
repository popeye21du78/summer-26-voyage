"use client";

import Image from "next/image";
import { BRAND_LOGO_FILTER } from "@/lib/brandLogoStyle";

/**
 * Deuxième emplacement A1 — grand, centré, filtre marque (dégradé terracotta).
 */
export default function AccueilHeroBrandMark() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[40%] z-[8] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 opacity-[0.92] sm:top-[38%] sm:opacity-[0.94]"
      aria-hidden
    >
      <div className="relative aspect-[2.35/1] w-full">
        <Image
          src="/A1.png"
          alt=""
          fill
          sizes="(max-width: 640px) 92vw, 24rem"
          className="object-contain object-center"
          style={{ filter: BRAND_LOGO_FILTER.heroCenter }}
          priority
        />
      </div>
    </div>
  );
}
