"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Clock, MapPin, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";

const StarFlipMap = dynamic(() => import("./StarFlipMap"), { ssr: false });

type Props = {
  itinerary: StarItineraryEditorialItem;
  isFlipped: boolean;
  onFlip: () => void;
  compact?: boolean;
};

export default function StarFlipCard({ itinerary, isFlipped, onFlip, compact }: Props) {
  const [resolvedSteps, setResolvedSteps] = useState<ResolvedStarStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isFlipped || resolvedSteps.length > 0) return;
    fetch(
      `/api/inspiration/star-itinerary-detail?slug=${encodeURIComponent(
        itinerary.itinerarySlug
      )}&regionId=${encodeURIComponent(itinerary.regionId)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.resolvedSteps) {
          setResolvedSteps(data.resolvedSteps);
        }
      })
      .catch(() => {});
  }, [isFlipped, itinerary.itinerarySlug, itinerary.regionId, resolvedSteps.length]);

  const stepsForCarousel = useMemo(() => {
    if (resolvedSteps.length > 0) return resolvedSteps;
    return itinerary.steps.map((s) => ({
      slug: s.slug,
      nom: s.nom,
      lat: 0,
      lng: 0,
    }));
  }, [resolvedSteps, itinerary.steps]);

  const selectStep = useCallback((idx: number) => {
    setActiveStep(idx);
  }, []);

  const firstStepSlug = itinerary.steps[0]?.slug ?? "";
  const aspect = compact ? "aspect-[2/3]" : "aspect-[3/4]";

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face */}
        <div
          className="relative w-full cursor-pointer overflow-hidden rounded-2xl border border-white/6 shadow-lg shadow-black/30"
          style={{ backfaceVisibility: "hidden" }}
          onClick={onFlip}
        >
          <div className={`relative ${aspect} w-full overflow-hidden bg-[#1c1c1c]`}>
            <CityPhoto
              stepId={firstStepSlug}
              ville={itinerary.steps[0]?.nom ?? ""}
              alt={itinerary.tripTitle}
              className="absolute inset-0 h-full w-full object-cover"
              photoCuration
              curationTitle={itinerary.tripTitle}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 font-courier text-[10px] font-bold text-white/80 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-[#E07856]" />
              {itinerary.durationHint}
            </span>

            <div className="absolute inset-x-0 bottom-0 p-5">
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

        {/* Back face */}
        <div
          className="absolute inset-0 w-full overflow-hidden rounded-2xl border border-white/6 bg-[#141414] shadow-lg shadow-black/30"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex h-full min-h-[420px] flex-col sm:min-h-[480px]">
            <div className="relative h-[38%] min-h-[150px] shrink-0">
              {isFlipped && resolvedSteps.length > 0 ? (
                <StarFlipMap
                  steps={resolvedSteps}
                  activeStepIndex={activeStep}
                  mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#1c1c1c]">
                  <MapPin className="h-8 w-8 text-[#E07856]/15" />
                </div>
              )}

              <button
                type="button"
                onClick={onFlip}
                className="absolute left-3 top-3 z-10 rounded-xl bg-black/50 p-1.5 text-white/60 backdrop-blur-sm transition hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative shrink-0 border-y border-white/6 bg-[#0e0e0e] py-2">
                <div className="flex max-h-[min(42vh,300px)] flex-col gap-2 overflow-y-auto px-3 scrollbar-hide">
                  {stepsForCarousel.map((step, i) => (
                    <button
                      key={`${step.slug}-${i}`}
                      type="button"
                      onClick={() => selectStep(i)}
                      className={`relative w-full overflow-hidden rounded-xl text-left transition-all duration-300 ${
                        activeStep === i
                          ? "ring-2 ring-[#E07856] ring-offset-1 ring-offset-[#141414]"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div className="relative h-[100px] w-full sm:h-[112px]">
                        <CityPhoto
                          stepId={step.slug}
                          ville={step.nom}
                          alt={step.nom}
                          className="absolute inset-0 h-full w-full object-cover"
                          photoCuration
                          curationCompact
                          curationTitle={step.nom}
                        />
                        <div className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-black/40 px-3">
                          <span className="text-center font-courier text-sm font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] sm:text-base">
                            {step.nom}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {stepsForCarousel[activeStep] && (
                <Link
                  href={`/inspirer/ville/${stepsForCarousel[activeStep].slug}?from=stars&region=${itinerary.regionId}`}
                  className="flex shrink-0 items-center gap-2 border-b border-white/6 px-4 py-2.5 transition hover:bg-white/3"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E07856]" />
                  <span className="font-courier text-sm font-bold text-white/75">
                    {stepsForCarousel[activeStep].nom}
                  </span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/20" />
                </Link>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <p className="font-courier text-xs leading-relaxed text-white/50">
                  {itinerary.summary}
                </p>

                {itinerary.overnightStyle && (
                  <p className="mt-3 rounded-xl bg-white/3 px-3 py-2 font-courier text-[11px] italic text-white/30">
                    {itinerary.overnightStyle}
                  </p>
                )}

                <Link
                  href={`/preparer?fromStar=${itinerary.itinerarySlug}&region=${itinerary.regionId}`}
                  className="btn-orange-glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-courier text-xs font-bold text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Créer mon voyage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
