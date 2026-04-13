"use client";

import PhilosophieCylindre from "../PhilosophieCylindre";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

export default function HomeMarqueFooter() {
  return (
    <section
      id="philosophie-section"
      className={`relative bg-gradient-to-br from-[#4a2f16] via-[#6B4423] to-[#8B4513] ${SNAP_SECTION}`}
      aria-labelledby="marque-titre"
    >
      <HomeDecorTitle lines={["NOTRE", "REGARD"]} tone="onDark" />
      <div
        className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="marque-titre"
          className={`relative mb-3 max-w-[95%] text-[#FAF4F0] ${HOME_SECTION_H2}`}
        >
          Notre regard
        </h2>
        <p className="mb-5 max-w-[95%] font-courier text-xs leading-relaxed text-[#FAF4F0]/55">
          Liberté du van, soin du carnet.
        </p>
        <div className="max-h-[min(52vh,420px)] w-full overflow-y-auto pr-1">
          <div className="flex w-full min-w-0 justify-start opacity-95">
            <PhilosophieCylindre />
          </div>
        </div>
      </div>
    </section>
  );
}
