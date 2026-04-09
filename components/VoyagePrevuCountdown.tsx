"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Voyage } from "../data/mock-voyages";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";

type Props = {
  voyage: Voyage;
  joursRestants: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function VoyagePrevuCountdown({ voyage, joursRestants }: Props) {
  const [diff, setDiff] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    function update() {
      const debut = new Date(voyage.dateDebut + "T00:00:00");
      const now = new Date();
      const ms = debut.getTime() - now.getTime();
      if (ms <= 0) {
        setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000) % 60;
      const h = Math.floor(ms / 3600000) % 24;
      const d = Math.floor(ms / 86400000);
      setDiff({ days: d, hours: h, minutes: m, seconds: s });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [voyage.dateDebut]);

  const heroSteps = voyage.steps.map((s) => ({ id: s.id, nom: s.nom }));

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <HeroPhotoStripResolved steps={heroSteps} />

      {/* Contenu centré — au-dessus des photos */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 pt-16">
        <p className="mb-2 font-courier text-center text-xl font-bold uppercase tracking-[0.3em] text-white/90 md:text-2xl">
          VAN TRIP
        </p>
        <h1 className="mb-2 font-courier text-center text-3xl font-bold tracking-wider text-transparent md:text-5xl md:text-6xl" style={{ background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)", backgroundClip: "text", WebkitBackgroundClip: "text" }}>
          {voyage.titre.toUpperCase()}
        </h1>
        <p className="mb-12 font-courier text-center text-sm font-bold tracking-widest text-white/90 md:text-base">
          {voyage.sousTitre}
        </p>

        {/* Compte à rebours géant */}
        <div className="mb-12 flex gap-3 md:gap-6">
          {diff ? (
            <>
              <div className="flex flex-col items-center">
                <span className="font-mono text-5xl font-light tabular-nums text-white drop-shadow-lg md:text-7xl">
                  {pad(diff.days)}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-white/80">
                  jours
                </span>
              </div>
              <span className="font-mono text-4xl font-light text-white/60 md:text-6xl">
                :
              </span>
              <div className="flex flex-col items-center">
                <span className="font-mono text-5xl font-light tabular-nums text-white drop-shadow-lg md:text-7xl">
                  {pad(diff.hours)}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-white/80">
                  heures
                </span>
              </div>
              <span className="font-mono text-4xl font-light text-white/60 md:text-6xl">
                :
              </span>
              <div className="flex flex-col items-center">
                <span className="font-mono text-5xl font-light tabular-nums text-white drop-shadow-lg md:text-7xl">
                  {pad(diff.minutes)}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-white/80">
                  min
                </span>
              </div>
              <span className="font-mono text-4xl font-light text-white/60 md:text-6xl">
                :
              </span>
              <div className="flex flex-col items-center">
                <span className="font-mono text-5xl font-light tabular-nums text-white drop-shadow-lg md:text-7xl">
                  {pad(diff.seconds)}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-white/80">
                  sec
                </span>
              </div>
            </>
          ) : (
            <div className="font-mono text-5xl text-white/80">-- : -- : -- : --</div>
          )}
        </div>

        {/* Villes en badges modernes */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {voyage.steps.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-white/40 bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              {s.nom}
            </span>
          ))}
        </div>

        <Link
          href={`/voyage/${voyage.id}/prevu`}
          className="btn-terracotta rounded-[50px] border-2 border-white bg-white/95 px-10 py-4 font-courier font-bold text-[#A55734] shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-white hover:shadow-[#E07856]/70"
        >
          Voir le voyage
        </Link>
      </div>

      {/* Incitation au scroll */}
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
