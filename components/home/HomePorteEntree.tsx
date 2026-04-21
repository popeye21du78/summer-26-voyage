"use client";

import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

/** Porte d’entrée — brique / terracotta (alternance avec le hero clair). */
export default function HomePorteEntree() {
  return (
    <section
      id="on-repart"
      className={`relative scroll-mt-0 border-t border-white/10 bg-gradient-to-br from-[#8B4A3C] via-[#6B3830] to-[#4f2c26] ${SNAP_SECTION}`}
      aria-labelledby="porte-entree-titre"
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <video
          className="absolute inset-0 h-full w-full scale-[1.03] object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src="/A2.mp4"
        />
      </div>
      <HomeDecorTitle lines={["PAR", "OÙ"]} tone="onDark" />
      <div
        className={`relative z-10 justify-between ${SNAP_SECTION_SCROLL_INNER} px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <div>
          <p className="mb-2 font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5C4B8]">
            Étape 1
          </p>
          <h2
            id="porte-entree-titre"
            className={`relative mb-10 max-w-[95%] text-[#FFFBF7] ${HOME_SECTION_H2}`}
          >
            Par où commencer ?
          </h2>
        </div>

        <div className="flex max-w-lg flex-col gap-4">
          <Link
            href="/planifier/inspiration"
            className="group relative overflow-hidden rounded-2xl border border-[#F5C4B8]/40 bg-gradient-to-br from-[var(--color-accent-start)] via-[#d65a48] to-[#b84538] p-5 shadow-[0_14px_44px_rgba(0,0,0,0.25)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <span className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
                <Sparkles className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block font-courier text-lg font-bold uppercase tracking-wide text-white">
                  Explorer des idées
                </span>
                <span className="mt-1 block font-courier text-sm text-white/90">
                  Territoires & envies — sans engagement.
                </span>
              </span>
            </span>
          </Link>
          <Link
            href="/planifier/commencer"
            className="rounded-2xl border-2 border-white/30 bg-white/12 p-5 backdrop-blur-md transition hover:border-white/50 hover:bg-white/18"
          >
            <span className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#FFD4C8] ring-1 ring-white/25">
                <Compass className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block font-courier text-lg font-bold uppercase tracking-wide text-[#FFFBF7]">
                  Commencer un voyage
                </span>
                <span className="mt-1 block font-courier text-sm text-[#FAF4F0]/75">
                  Zone, axe, lieux, recherche.
                </span>
              </span>
            </span>
          </Link>
        </div>
        <div className="min-h-8 flex-1" aria-hidden />
      </div>
    </section>
  );
}
