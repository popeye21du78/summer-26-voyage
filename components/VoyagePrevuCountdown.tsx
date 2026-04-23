"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Voyage } from "../data/mock-voyages";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";
import AccueilHeroBrandMark from "./home/AccueilHeroBrandMark";
import HomeDecorTitle from "./home/HomeDecorTitle";
import BrandLogo from "./layout/BrandLogo";
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

/**
 * Cellule standard du compte à rebours (jours/heures/minutes).
 * Les secondes ont leur propre composant `SecondsOdometer` avec chiffres
 * qui défilent indépendamment — bien plus visuel.
 */
function CountdownUnit({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/8 px-2 py-3 backdrop-blur-md">
      <span className="relative font-mono text-[1.9rem] font-light tabular-nums leading-none text-white drop-shadow sm:text-[2.3rem]">
        {pad(value)}
      </span>
      <span className="mt-1.5 font-courier text-[9px] font-bold uppercase tracking-[0.22em] text-white/60">
        {label}
      </span>
    </div>
  );
}

/**
 * Odomètre des secondes — chaque chiffre est démonté/remonté à chaque changement
 * pour déclencher l'animation `countdown-seconds-roll` (montée depuis le bas
 * avec flou). On sépare dizaines et unités pour que seule l'unité roule chaque
 * seconde (plus naturel, moins bruyant pour l'œil).
 */
function SecondsOdometer({ value }: { value: number }) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return (
    <div className="relative flex items-center justify-center gap-2 rounded-3xl border border-[color-mix(in_srgb,var(--color-accent-start)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-start)_14%,transparent)] px-5 py-3 backdrop-blur-md">
      <span
        aria-hidden
        className="absolute -top-[1px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
      <div className="flex items-baseline gap-[6px]">
        <span
          key={`t-${tens}`}
          className="countdown-seconds-roll font-mono text-[3.4rem] font-semibold tabular-nums leading-none text-white drop-shadow-lg sm:text-[4rem]"
          style={{
            textShadow:
              "0 0 24px color-mix(in srgb, var(--color-accent-start) 60%, transparent)",
          }}
        >
          {tens}
        </span>
        <span
          key={`o-${ones}`}
          className="countdown-seconds-roll font-mono text-[3.4rem] font-semibold tabular-nums leading-none text-white drop-shadow-lg sm:text-[4rem]"
          style={{
            textShadow:
              "0 0 24px color-mix(in srgb, var(--color-accent-start) 60%, transparent)",
          }}
        >
          {ones}
        </span>
      </div>
      <span className="ml-1 font-courier text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--color-accent-start)]">
        sec
      </span>
    </div>
  );
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
        className={`relative z-20 flex h-full min-h-0 flex-col items-center justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] text-center ${SNAP_SECTION_SCROLL_INNER}`}
      >
        {/**
         * Le compte à rebours est repositionné comme CENTRE de gravité de la page
         * (demande user). Le titre du voyage reste au-dessus mais plus compact.
         * Les étapes/pills passent sous le countdown pour ne pas concurrencer la lecture.
         */}
        <h1
          className="relative mb-1 max-w-[95%] text-[1.45rem] font-bold uppercase leading-tight tracking-tight text-transparent sm:text-[1.7rem]"
          style={{
            background: "linear-gradient(to right, var(--color-accent-start), var(--color-accent-mid), var(--color-accent-gold))",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            fontFamily: "var(--font-title), var(--font-courier)",
          }}
        >
          {voyage.titre}
        </h1>
        <p className="mb-6 font-courier text-[11px] text-white/55">{voyage.sousTitre}</p>

        {/**
         * Bloc countdown central :
         *  - `countdown-halo` fait battre discrètement une auréole accent autour
         *    du bloc (rappel visuel de l'urgence douce — on « sent » le temps qui avance)
         *  - les secondes utilisent `countdown-seconds-roll` (odomètre descendant)
         *  - la cellule « sec » est mise en avant (bordure accent) pour guider l'œil
         */}
        <div className="countdown-halo relative w-full max-w-md rounded-[28px] border border-white/10 bg-black/25 p-4 sm:p-5">
          {/**
           * Marque Viago (V stylisé, colorisé par masque) au-dessus du compteur :
           * rappel d'identité au CENTRE de gravité du hero d'Accueil.
           */}
          <BrandLogo
            variant="mark"
            tone="accent"
            size={28}
            className="absolute -top-4 left-1/2 -translate-x-1/2"
            style={{
              filter:
                "drop-shadow(0 0 14px color-mix(in srgb, var(--color-accent-start) 70%, transparent))",
            }}
          />
          {diff ? (
            <>
              {/**
               * Secondes mises en exergue : gros chiffres qui défilent,
               * bordure accent et halo — on SENT le temps s'écouler.
               */}
              <SecondsOdometer value={diff.seconds} />
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                <CountdownUnit value={diff.days} label="jours" />
                <CountdownUnit value={diff.hours} label="heures" />
                <CountdownUnit value={diff.minutes} label="minutes" />
              </div>
            </>
          ) : (
            <div className="text-center font-mono text-3xl text-white/80">—</div>
          )}
          <p className="mt-3 text-center font-courier text-[10px] uppercase tracking-[0.35em] text-white/50">
            avant le grand départ
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {voyage.steps.slice(0, 5).map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-white/20 bg-white/8 px-3 py-1 font-courier text-[10px] font-bold text-white/80"
            >
              {s.nom}
            </span>
          ))}
        </div>

        <Link
          href={`/mon-espace/voyage/${voyage.id}`}
          className="mt-6 w-full max-w-md rounded-2xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] py-3.5 text-center font-courier text-sm font-bold text-white shadow-lg"
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
              className="mt-2 inline-block font-courier text-xs font-bold text-[var(--color-accent-start)]"
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
