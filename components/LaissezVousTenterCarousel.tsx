"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LieuResolvedBackground } from "./LieuResolvedBackground";

export type CarouselVoyage = {
  id: string;
  titre: string;
  dureeJours: number;
  steps: Array<{
    id: string;
    nom: string;
    contenu_voyage?: { photos?: string[] };
  }>;
};

type Props = {
  voyages: CarouselVoyage[];
  /** Titre au-dessus du carousel (défaut : pré-voyages). Vide = masqué. */
  heading?: string;
  /** Cartes plus opaques / contrastées (accueil). */
  dense?: boolean;
};

export default function LaissezVousTenterCarousel({
  voyages,
  heading = "Laissez-vous tenter",
  dense = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const n = voyages.length;
  const safeIndex = Math.max(0, Math.min(n - 1, index));
  const v = voyages[safeIndex];
  const firstStep = v?.steps[0];
  const villes = v?.steps.map((s) => s.nom).join(" → ") ?? "";

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) return n - 1;
        if (next >= n) return 0;
        return next;
      });
    },
    [n]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx > 0) go(-1);
    else go(1);
  };

  if (!v) return null;

  const cardShell = dense
    ? "border-2 border-[#E07856]/55 bg-white/95 shadow-xl ring-1 ring-[#E07856]/20"
    : "border-2 border-[#E07856]/20 bg-white/70 shadow-md";

  return (
    <div className="relative w-full max-w-full select-none">
      {heading ? (
        <h3 className="mb-2 font-courier text-base font-bold uppercase tracking-wider text-[#A55734] sm:mb-3 sm:text-lg md:text-xl">
          {heading}
        </h3>
      ) : null}

      <div className="relative flex items-stretch gap-1 sm:items-center sm:gap-2">
        <button
          type="button"
          aria-label="Destination précédente"
          onClick={() => go(-1)}
          className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#E07856]/40 bg-white/90 text-[#A55734] shadow-md transition-all hover:scale-105 hover:border-[#E07856] hover:bg-white"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl sm:rounded-2xl ${cardShell}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Link href="/prevoyages" className="group flex min-h-0 flex-col">
            {firstStep ? (
              <LieuResolvedBackground
                key={`${v.id}-${firstStep.id}`}
                ville={firstStep.nom}
                stepId={firstStep.id}
                className="h-28 w-full shrink-0 transition-transform duration-300 group-hover:scale-[1.02] sm:h-32 md:h-40"
              />
            ) : (
              <div
                className="h-28 w-full shrink-0 bg-gradient-to-br from-[#A55734] to-[#8b4728] sm:h-32 md:h-40"
                aria-hidden
              />
            )}
            <div className="p-2.5 sm:p-3 md:p-4">
              <p className="line-clamp-2 font-courier text-sm font-bold text-[#333333] sm:text-base md:text-lg">
                {v.titre}
              </p>
              <p className="mt-0.5 line-clamp-2 font-courier text-xs text-[#333333]/70 sm:text-sm">
                {v.dureeJours} j · {villes}
              </p>
              <p className="mt-2 font-courier text-xs font-bold text-[#E07856] sm:text-sm">
                Pré-voyages →
              </p>
            </div>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Destination suivante"
          onClick={() => go(1)}
          className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#E07856]/40 bg-white/90 text-[#A55734] shadow-md transition-all hover:scale-105 hover:border-[#E07856] hover:bg-white"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {voyages.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Aller à la destination ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === safeIndex
                ? "w-6 bg-[#E07856]"
                : "w-2 bg-[#E07856]/30 hover:bg-[#E07856]/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
