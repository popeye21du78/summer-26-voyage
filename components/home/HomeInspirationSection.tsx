"use client";

import LaissezVousTenterCarousel from "../LaissezVousTenterCarousel";
import { VOYAGES_PREFAITS } from "../../data/mock-voyages";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

export default function HomeInspirationSection() {
  const voyages = VOYAGES_PREFAITS.map((v) => ({
    id: v.id,
    titre: v.titre,
    dureeJours: v.dureeJours,
    steps: v.steps.map((s) => ({
      id: s.id,
      nom: s.nom,
      contenu_voyage: s.contenu_voyage,
    })),
  }));

  return (
    <section
      id="inspiration-section"
      className={`relative border-t border-[var(--color-accent-start)]/12 bg-gradient-to-b from-[#FFF5EE] to-[var(--color-bg-main)] ${SNAP_SECTION}`}
      aria-labelledby="home-inspiration-titre"
    >
      <HomeDecorTitle lines={["IDÉ", "ES"]} tone="onLight" />
      <div
        className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} justify-between px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="home-inspiration-titre"
          className={`relative mb-6 max-w-[95%] text-[#2a211c] ${HOME_SECTION_H2}`}
        >
          Des idées pour partir
        </h2>
        <div className="min-h-0 flex-1">
          <LaissezVousTenterCarousel
            voyages={voyages}
            heading=""
            dense
          />
        </div>
      </div>
    </section>
  );
}
