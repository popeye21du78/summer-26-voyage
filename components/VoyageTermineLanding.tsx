"use client";

import Link from "next/link";
import { ChevronDown, Route } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";

type Props = {
  state: VoyageStateResponse;
};

export default function VoyageTermineLanding({ state }: Props) {
  const dernier = state.voyagesTermines![0];
  const joursDepuis = state.joursDepuisFinDernierVoyage ?? 0;
  const heroSteps = (dernier.steps ?? []).map((s) => ({ id: s.id, nom: s.nom }));
  const villes = (dernier.steps ?? []).slice(0, 4).map((s) => s.nom);

  const texteJours =
    joursDepuis <= 1
      ? "hier"
      : joursDepuis <= 2
        ? "avant-hier"
        : `à peine ${joursDepuis} jours`;

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <HeroPhotoStripResolved steps={heroSteps} />

      {/* Contenu centré — au-dessus des photos */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 pt-16">
        <p className="mb-2 font-courier text-center text-xl font-bold uppercase tracking-[0.3em] text-white/90 md:text-2xl">
          C&apos;ÉTAIT IL Y A
        </p>
        <h1
          className="mb-2 font-courier text-center text-3xl font-bold tracking-wider text-transparent md:text-5xl md:text-6xl"
          style={{
            background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          {texteJours.toUpperCase()}
        </h1>
        <p className="mb-2 font-courier text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
          {dernier.titre}
        </p>
        <p className="mb-8 font-courier text-center text-sm font-bold tracking-widest text-white/90">
          {dernier.sousTitre}
        </p>

        {/* Villes en badges */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {villes.map((v) => (
            <span
              key={v}
              className="rounded-full border border-white/40 bg-white/15 px-4 py-1.5 font-courier text-sm font-bold text-white backdrop-blur-sm"
            >
              {v}
            </span>
          ))}
        </div>

        {dernier.stats && (
          <div className="mb-8 flex gap-6 font-courier text-white/90">
            {dernier.stats.km != null && (
              <span className="flex items-center gap-1 font-bold">
                <Route className="h-4 w-4" />
                {dernier.stats.km} km
              </span>
            )}
            {dernier.stats.essence != null && (
              <span className="font-bold">⛽ {dernier.stats.essence} €</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/viago/${dernier.id}?from=termine`}
            className="btn-terracotta rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-10 py-4 font-courier font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[#E07856]/70"
          >
            Revivre le voyage
          </Link>
          <Link
            href={`/voyage/${dernier.id}/termine`}
            className="btn-terracotta rounded-[50px] border-2 border-white/80 bg-white/10 px-10 py-4 font-courier font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/20"
          >
            Modifier · Partager
          </Link>
        </div>
      </div>

      {/* Incitation au scroll (comme Van Trip) */}
      <div className="flex justify-center py-4">
        <button
          type="button"
          onClick={() =>
            document.getElementById("on-repart")?.scrollIntoView({
              behavior: "smooth",
            })
          }
          className="flex flex-col items-center gap-2 font-courier text-white/90 transition-all duration-300 hover:scale-110"
        >
          <span className="text-sm font-bold">On repart ?</span>
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
