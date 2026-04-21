"use client";

import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import HeroPhotoStripResolved from "../HeroPhotoStripResolved";
import { HERO_ACCUEIL_STEP_REFS } from "../../data/mock-voyages";
import AccueilHeroBrandMark from "./AccueilHeroBrandMark";
import HomeDecorTitle from "./HomeDecorTitle";
import { SNAP_SECTION } from "./homeSectionTokens";

type Props = {
  profileId?: string;
};

/**
 * Hero Cas A — fond papier chaud (pas noir), texte foncé, impact typo.
 */
export default function HeroNouveauVoyageur({ profileId }: Props) {
  const julie = profileId === "julie";
  const decor = julie ? ["ÉLAN", "NEUF"] : ["TON", "DÉPART"];

  return (
    <section
      id="hero-section"
      className={`relative ${SNAP_SECTION} bg-gradient-to-b from-[#FFF9F5] via-[#F3E8DD] to-[#EDD5C8]`}
    >
      <div className="absolute inset-0 opacity-[0.42] mix-blend-multiply">
        <HeroPhotoStripResolved steps={HERO_ACCUEIL_STEP_REFS} />
      </div>
      <div className="hero-accueil-warm-overlay pointer-events-none absolute inset-0 mix-blend-soft-light opacity-90" />
      <div className="hero-accueil-scrim pointer-events-none absolute inset-0" />

      <AccueilHeroBrandMark />
      <HomeDecorTitle lines={decor} tone="onLight" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-4 pb-10 pt-[calc(env(safe-area-inset-top,0px)+4rem)]">
        <div className="min-h-0 flex-1" />
        <div>
          <p className="mb-3 font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--color-accent-start)]">
            Viago
          </p>
          <h1
            className={`max-w-[98%] font-courier font-bold leading-[0.96] tracking-tight text-[#2a211c] ${
              julie
                ? "text-[2.55rem] sm:text-[2.95rem]"
                : "text-[2.25rem] sm:text-[2.65rem]"
            }`}
          >
            {julie ? (
              <>
                Lance
                <br />
                ton premier
                <br />
                grand départ.
              </>
            ) : (
              <>
                Ton premier voyage
                <br />
                commence ici.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-[94%] font-courier text-base leading-relaxed text-[#4a3a32]/75">
            Carnet, carte, envies — sans file d’attente.
          </p>
          <div className="mt-10 flex w-full max-w-lg flex-col gap-3">
            <Link href="/planifier/inspiration" className="viago-cta-primary w-full">
              <Sparkles className="h-5 w-5" aria-hidden />
              Explorer des idées
            </Link>
            <Link href="/planifier/commencer" className="viago-cta-secondary w-full">
              <Compass className="h-5 w-5" aria-hidden />
              Commencer un voyage
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
