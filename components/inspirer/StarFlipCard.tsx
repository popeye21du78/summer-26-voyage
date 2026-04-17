"use client";

import dynamic from "next/dynamic";
import { Clock, MapPin } from "lucide-react";
import { StarItineraryCover } from "@/components/inspirer/StarItineraryCover";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";

const StarFlipDetail = dynamic(() => import("./StarFlipDetail"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[480px] flex-col items-center justify-center bg-[#141414]">
      <div className="h-8 w-8 rounded-full border-2 border-[#E07856]/20 border-t-[#E07856] animate-spin" />
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
          <div className={`relative ${aspect} w-full overflow-hidden bg-[#1c1c1c]`}>
            <StarItineraryCover
              stepId={firstStepSlug}
              ville={itinerary.steps[0]?.nom ?? ""}
              tripTitle={itinerary.tripTitle}
              compact={compact}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 font-courier text-[10px] font-bold text-white/80 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-[#E07856]" />
              {itinerary.durationHint}
            </span>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
              <p className="font-courier text-[10px] font-bold uppercase tracking-[0.3em] text-[#E07856]">
                Itinéraire star
              </p>
              <h3 className="mt-1 font-courier text-lg font-bold leading-tight text-white">
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
          className="absolute inset-0 w-full overflow-hidden rounded-2xl border border-white/6 bg-[#141414] shadow-lg shadow-black/30"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {isFlipped ? (
            <StarFlipDetail itinerary={itinerary} onCloseFlip={onFlip} />
          ) : (
            <div className="min-h-[480px] bg-[#141414]" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}
