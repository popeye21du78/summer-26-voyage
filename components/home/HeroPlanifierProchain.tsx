"use client";

import Link from "next/link";
import { ChevronDown, Compass } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import HeroPhotoStripResolved from "../HeroPhotoStripResolved";
import AccueilHeroBrandMark from "./AccueilHeroBrandMark";
import HomeDecorTitle from "./HomeDecorTitle";
import { SNAP_SECTION, SNAP_SECTION_SCROLL_INNER } from "./homeSectionTokens";

/**
 * Hero Cas B — dernier voyage ancien : repartir d’abord, revivre ensuite.
 */
export default function HeroPlanifierProchain({
  state,
}: {
  state: VoyageStateResponse;
}) {
  const dernier = state.voyagesTermines?.[0];
  const heroSteps =
    dernier?.steps?.map((s) => ({ id: s.id, nom: s.nom })) ?? [];

  return (
    <section
      id="hero-section"
      className={`relative ${SNAP_SECTION} bg-gradient-to-b from-[#4a3a34] via-[#352b28] to-[#261f1d]`}
    >
      {heroSteps.length > 0 ? (
        <div className="absolute inset-0 opacity-45">
          <HeroPhotoStripResolved steps={heroSteps} />
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D]"
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410] via-[#1a1410]/80 to-transparent" />
      <AccueilHeroBrandMark />
      <HomeDecorTitle lines={["RE", "PART"]} tone="onDark" />

      <div
        className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-10 pt-[calc(env(safe-area-inset-top,0px)+4rem)]`}
      >
        <p className="mb-3 font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#E07856]/90">
          Prochaine étape
        </p>
        <h1 className="relative mb-4 max-w-[92%] font-courier text-[2rem] font-bold leading-[1.05] tracking-tight text-[#FAF4F0] sm:text-[2.35rem]">
          Planifie ton prochain voyage
        </h1>
        {dernier && (
          <p className="mb-8 max-w-[94%] font-courier text-sm leading-relaxed text-[#FAF4F0]/55">
            Dernier carnet : {dernier.titre}
          </p>
        )}

        <div className="mt-auto flex max-w-md flex-col gap-3">
          <Link
            href="/planifier/commencer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-4 font-courier text-base font-bold text-white shadow-[0_10px_36px_rgba(224,120,86,0.45)] transition hover:brightness-105"
          >
            <Compass className="h-5 w-5" aria-hidden />
            Nouveau départ
          </Link>
          {dernier && (
            <Link
              href={`/voyage/${dernier.id}/termine`}
              className="w-full rounded-2xl border-2 border-white/30 bg-white/10 py-3.5 text-center font-courier text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/16"
            >
              Revivre le dernier voyage
            </Link>
          )}
        </div>

        <div className="mt-8 shrink-0">
          <button
            type="button"
            onClick={() =>
              document.getElementById("on-repart")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="flex items-center gap-2 font-courier text-xs font-bold text-white/65"
          >
            Suite de l’accueil
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
