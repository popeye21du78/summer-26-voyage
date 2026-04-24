"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import { Clock, MapPin } from "lucide-react";
import { StarItineraryCover } from "@/components/inspirer/StarItineraryCover";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import { getProfileById } from "@/data/test-profiles";
import { withReturnTo } from "@/lib/return-to";

const StarFlipDetail = dynamic(() => import("./StarFlipDetail"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[480px] flex-col items-center justify-center bg-[var(--color-bg-main)]">
      <div className="h-8 w-8 rounded-full border-2 border-[var(--color-accent-start)]/20 border-t-[var(--color-accent-start)] animate-spin" />
    </div>
  ),
});

type Props = {
  itinerary: StarItineraryEditorialItem;
  isFlipped: boolean;
  onFlip: () => void;
  compact?: boolean;
};

/**
 * Recto léger (couverture sans CityPhoto lourd). Verso = chunk séparé chargé au premier retournement.
 */
export default function StarFlipCard({ itinerary, isFlipped, onFlip, compact }: Props) {
  const here = useReturnBase();
  const editorial =
    itinerary.editorialProfileId != null
      ? getProfileById(itinerary.editorialProfileId)
      : undefined;

  const firstStepSlug = itinerary.steps[0]?.slug ?? "";
  const aspect = compact ? "aspect-[2/3]" : "aspect-[3/4]";

  return (
    <div
      className="relative w-full [content-visibility:auto] [contain-intrinsic-size:auto_480px]"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Recto */}
        <div
          className="relative w-full cursor-pointer overflow-hidden rounded-2xl border border-white/6 shadow-lg shadow-black/30"
          style={{ backfaceVisibility: "hidden" }}
          onClick={onFlip}
        >
          <div className={`relative ${aspect} w-full overflow-hidden bg-[var(--color-bg-secondary)]`}>
            <StarItineraryCover
              stepId={firstStepSlug}
              ville={itinerary.steps[0]?.nom ?? ""}
              tripTitle={itinerary.tripTitle}
              compact={compact}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 font-courier text-[10px] font-bold text-white/80 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-[var(--color-accent-start)]" />
              {itinerary.durationHint}
            </span>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
              <p className="font-courier text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-accent-start)]">
                Itinéraire star
              </p>
              {editorial && itinerary.editorialProfileId && (
                <Link
                  href={withReturnTo(`/profil/${itinerary.editorialProfileId}`, here)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex max-w-full rounded-full border border-white/15 bg-black/35 px-2.5 py-1 font-courier text-[9px] font-bold text-[var(--color-accent-start)]/95 backdrop-blur-sm transition hover:border-[var(--color-accent-start)]/40"
                >
                  Une manière de voyager · {editorial.name}
                </Link>
              )}
              <h3 className="font-title mt-1 text-2xl font-bold leading-tight text-white">
                {itinerary.tripTitle}
              </h3>
              {!compact && (
                <p className="mt-2 line-clamp-2 font-courier text-xs leading-relaxed text-white/50">
                  {itinerary.summary?.slice(0, 120)}…
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5 font-courier text-[10px] text-white/30">
                <MapPin className="h-3 w-3" />
                {itinerary.steps.length} étapes
              </div>
            </div>
          </div>
        </div>

        {/* Verso — chunk lourd seulement si retourné */}
        <div
          className="absolute inset-0 w-full overflow-x-hidden overflow-y-auto rounded-2xl border border-white/6 bg-[var(--color-bg-main)] shadow-lg shadow-black/30"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {isFlipped ? (
            <StarFlipDetail itinerary={itinerary} onCloseFlip={onFlip} />
          ) : (
            <div className="min-h-[480px] bg-[var(--color-bg-main)]" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}
