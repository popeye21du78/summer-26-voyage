"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Voyage } from "../data/mock-voyages";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";
import AccueilHeroBrandMark from "./home/AccueilHeroBrandMark";
import HomeDecorTitle from "./home/HomeDecorTitle";
import { SNAP_SECTION, SNAP_SECTION_SCROLL_INNER } from "./home/homeSectionTokens";

type Props = {
  voyage: Voyage;
  joursRestants: number;
  /** Autres voyages à venir (démo : plusieurs prévus). */
  autresPrevus?: Voyage[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function VoyagePrevuCountdown({
  voyage,
  joursRestants: _joursRestants,
  autresPrevus,
}: Props) {
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

  const suitePrevus =
    autresPrevus?.filter((v) => v.id !== voyage.id) ?? [];

  return (
    <section
      id="hero-section"
      className={`relative ${SNAP_SECTION} bg-gradient-to-b from-[#3d2f2a] via-[#2c2420] to-[#1f1a18]`}
    >
      <div className="absolute inset-0 opacity-50">
        <HeroPhotoStripResolved steps={heroSteps} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14100e]/85 to-[#14100e]" />
      <AccueilHeroBrandMark />
      <HomeDecorTitle lines={["DÉ", "PART"]} tone="onDark" />

      <div
        className={`relative z-20 px-4 pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] ${SNAP_SECTION_SCROLL_INNER}`}
      >
        <p className="mb-2 font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#E07856]">
          Prochain départ
        </p>
        <h1
          className="relative mb-1 max-w-[95%] font-courier text-[1.65rem] font-bold uppercase leading-tight tracking-tight text-transparent sm:text-[1.85rem]"
          style={{
            background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          {voyage.titre}
        </h1>
        <p className="mb-6 font-courier text-xs text-white/60">{voyage.sousTitre}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {voyage.steps.slice(0, 5).map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-courier text-[11px] font-bold text-white/90"
            >
              {s.nom}
            </span>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-2 sm:gap-3">
          {diff ? (
            <>
              <div className="flex flex-col">
                <span className="font-mono text-4xl font-light tabular-nums text-white drop-shadow sm:text-5xl">
                  {pad(diff.days)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                  jours
                </span>
              </div>
              <span className="mb-4 font-mono text-2xl text-white/40">:</span>
              <div className="flex flex-col">
                <span className="font-mono text-4xl font-light tabular-nums text-white drop-shadow sm:text-5xl">
                  {pad(diff.hours)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                  h
                </span>
              </div>
              <span className="mb-4 font-mono text-2xl text-white/40">:</span>
              <div className="flex flex-col">
                <span className="font-mono text-4xl font-light tabular-nums text-white drop-shadow sm:text-5xl">
                  {pad(diff.minutes)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                  min
                </span>
              </div>
              <span className="mb-4 font-mono text-2xl text-white/40">:</span>
              <div className="flex flex-col">
                <span className="font-mono text-4xl font-light tabular-nums text-white drop-shadow sm:text-5xl">
                  {pad(diff.seconds)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                  s
                </span>
              </div>
            </>
          ) : (
            <div className="font-mono text-3xl text-white/80">—</div>
          )}
        </div>

        <Link
          href={`/mon-espace/voyage/${voyage.id}`}
          className="mb-4 w-full max-w-md rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-3.5 text-center font-courier text-sm font-bold text-white shadow-lg"
        >
          Ouvrir le carnet prévu
        </Link>

        {suitePrevus.length > 0 && (
          <div className="mb-4 w-full max-w-md rounded-2xl border border-white/25 bg-black/30 p-3 backdrop-blur-sm">
            <p className="mb-2 font-courier text-[10px] font-bold uppercase tracking-wider text-white/75">
              Autres voyages prévus
            </p>
            <ul className="space-y-2">
              {suitePrevus.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/mon-espace/voyage/${v.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-courier text-sm font-bold text-white"
                  >
                    <span className="truncate">{v.titre}</span>
                    <span className="text-white/70">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/planifier/commencer"
              className="mt-2 inline-block font-courier text-xs font-bold text-[#E07856]"
            >
              + Autre voyage
            </Link>
          </div>
        )}

        <div className="mt-auto flex shrink-0 pb-4">
          <button
            type="button"
            onClick={() =>
              document.getElementById("on-repart")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="flex items-center gap-2 font-courier text-xs font-bold text-white/70"
          >
            Suite
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
