"use client";

import Link from "next/link";
import { ChevronDown, Route } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";
import AccueilHeroBrandMark from "./home/AccueilHeroBrandMark";
import HomeDecorTitle from "./home/HomeDecorTitle";
import { SNAP_SECTION, SNAP_SECTION_SCROLL_INNER } from "./home/homeSectionTokens";

type Props = {
  state: VoyageStateResponse;
};

export default function VoyageTermineLanding({ state }: Props) {
  const dernier = state.voyagesTermines![0];
  const joursDepuis = state.joursDepuisFinDernierVoyage ?? 0;
  const heroSteps = (dernier.steps ?? []).map((s) => ({ id: s.id, nom: s.nom }));
  const villes = (dernier.steps ?? []).slice(0, 5).map((s) => s.nom);

  const texteJours =
    joursDepuis <= 1
      ? "hier"
      : joursDepuis <= 2
        ? "avant-hier"
        : `${joursDepuis} jours`;

  return (
    <section
      id="hero-section"
      className={`relative ${SNAP_SECTION} bg-gradient-to-b from-[#3d2f2a] to-[#221c1a]`}
    >
      <div className="absolute inset-0 opacity-45">
        <HeroPhotoStripResolved steps={heroSteps} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#14100e]" />
      <AccueilHeroBrandMark />
      <HomeDecorTitle lines={["SOU", "VENIR"]} tone="onDark" />

      <div
        className={`relative z-20 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+4rem)]`}
      >
        <p className="mb-2 font-courier text-[10px] font-bold uppercase tracking-[0.35em] text-[#E07856]">
          C&apos;était
        </p>
        <h1
          className="relative mb-2 max-w-[95%] font-courier text-[2rem] font-bold uppercase leading-none tracking-tight text-transparent sm:text-[2.4rem]"
          style={{
            background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          {texteJours}
        </h1>
        <p className="mb-6 font-courier text-xl font-bold text-[#FAF4F0]">
          {dernier.titre}
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {villes.map((v) => (
            <span
              key={v}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-courier text-[11px] font-bold text-white/90"
            >
              {v}
            </span>
          ))}
        </div>

        {dernier.stats && (
          <div className="mb-6 flex flex-wrap gap-4 font-courier text-sm font-bold text-white/85">
            {dernier.stats.km != null && (
              <span className="flex items-center gap-1">
                <Route className="h-4 w-4" />
                {dernier.stats.km} km
              </span>
            )}
            {dernier.stats.essence != null && (
              <span>⛽ {dernier.stats.essence} €</span>
            )}
          </div>
        )}

        <div className="mt-auto flex max-w-md flex-col gap-3">
          <Link
            href={`/viago/${dernier.id}?from=termine`}
            className="w-full rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-3.5 text-center font-courier text-sm font-bold text-white shadow-lg"
          >
            Revivre le voyage
          </Link>
          <Link
            href={`/voyage/${dernier.id}/termine`}
            className="w-full rounded-2xl border border-white/35 bg-white/10 py-3.5 text-center font-courier text-sm font-bold text-white"
          >
            Carnet & partage
          </Link>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() =>
              document.getElementById("on-repart")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="flex items-center gap-2 font-courier text-xs font-bold text-white/65"
          >
            Suite
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
