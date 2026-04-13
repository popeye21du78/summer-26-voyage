"use client";

import HomeDecorTitle from "./HomeDecorTitle";
import { SNAP_SECTION, SNAP_SECTION_SCROLL_INNER } from "./homeSectionTokens";

/**
 * Mot du créateur — tonalité éditoriale Viago (contenu évolutif).
 */
export default function HomeMotCreateur() {
  return (
    <section
      id="section-createur"
      className={`relative border-t border-[#E07856]/25 bg-gradient-to-b from-[#2f2826] to-[#1f1a19] ${SNAP_SECTION}`}
      aria-labelledby="mot-createur-titre"
    >
      <HomeDecorTitle lines={["LE", "MOT"]} tone="onDark" />
      <div className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}>
        <p className="mb-2 font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#E07856]/90">
          Mot du créateur
        </p>
        <h2
          id="mot-createur-titre"
          className="relative mb-5 max-w-[85%] font-courier text-2xl font-bold leading-tight tracking-wide text-[#FAF4F0]"
        >
          Viago, c’est le carnet que j’aurais voulu avoir sur la route.
        </h2>
        <div className="space-y-4 font-courier text-sm leading-relaxed text-[#FAF4F0]/75">
          <p>
            J’ai bâti cette app comme un regard : des idées concrètes, une carte qui
            respire, et la place pour les détails qui comptent — ceux qu’on note le
            soir au feu de camp.
          </p>
          <p className="text-[#FAF4F0]/55">
            La route est à toi ; Viago ne fait qu’ouvrir les pages.
          </p>
        </div>
      </div>
    </section>
  );
}
