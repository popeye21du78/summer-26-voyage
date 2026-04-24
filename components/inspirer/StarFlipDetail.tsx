"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import { withReturnTo } from "@/lib/return-to";
import dynamic from "next/dynamic";
import { MapPin, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";

const StarFlipMap = dynamic(() => import("./StarFlipMap"), { ssr: false });

type Props = {
  itinerary: StarItineraryEditorialItem;
  onCloseFlip: () => void;
};

/**
 * Verso « Star » : comme Amis (carte + bande + CTA en overlay) mais tout le
 * bloc (carte + textes) partage **un seul** défilement vertical — plus de
 * scroll interne uniquement sur le texte.
 */
export default function StarFlipDetail({ itinerary, onCloseFlip }: Props) {
  const currentLocation = useReturnBase();

  const [resolvedSteps, setResolvedSteps] = useState<ResolvedStarStep[] | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const resetRaf = requestAnimationFrame(() => setResolvedSteps(null));
    fetch(
      `/api/inspiration/star-itinerary-detail?slug=${encodeURIComponent(
        itinerary.itinerarySlug
      )}&regionId=${encodeURIComponent(itinerary.regionId)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const steps = data?.resolvedSteps;
        setResolvedSteps(Array.isArray(steps) ? steps : []);
      })
      .catch(() => {
        if (!cancelled) setResolvedSteps([]);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(resetRaf);
    };
  }, [itinerary.itinerarySlug, itinerary.regionId]);

  const stepsForStrip = useMemo(() => {
    if (resolvedSteps && resolvedSteps.length > 0) return resolvedSteps;
    return itinerary.steps.map((s) => ({
      slug: s.slug,
      nom: s.nom,
      lat: 0,
      lng: 0,
    }));
  }, [resolvedSteps, itinerary.steps]);

  const scrollToStep = useCallback((idx: number) => {
    setActiveStep(idx);
    const el = carouselRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    setActiveStep(closest);
  }, []);

  const mapSteps = resolvedSteps && resolvedSteps.length > 0 ? resolvedSteps : null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const preparerFromStar = withReturnTo(
    `/preparer?fromStar=${itinerary.itinerarySlug}&region=${itinerary.regionId}`,
    currentLocation
  );

  return (
    <div className="h-full w-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[var(--color-bg-main)] [scrollbar-gutter:stable]">
      {/*
        Hauteur cartographique explicite : le `fitBounds` reçoit un conteneur
        aux dimensions stables dès le premier rendu (évite le zoom incohérent).
      */}
      <div
        className="relative w-full shrink-0"
        style={{ height: "min(56dvh, 400px)", minHeight: 260, maxHeight: 520 }}
      >
        {resolvedSteps === null ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-bg-secondary)]">
            <div className="h-7 w-7 rounded-full border-2 border-[var(--color-accent-start)]/20 border-t-[var(--color-accent-start)] animate-spin" />
            <p className="font-courier text-[10px] text-white/25">Carte…</p>
          </div>
        ) : mapSteps ? (
          <div className="absolute inset-0">
            {/*
              maxZoom un peu bas + pas de pan sur l’étape : l’itinéraire
              reste lisible d’un coup. pan désactivé surtout ici.
            */}
            <StarFlipMap
              steps={mapSteps}
              activeStepIndex={activeStep}
              mapboxToken={token}
              topInsetPx={48}
              bottomInsetPx={200}
              maxZoomFit={10.4}
              panToActiveStep={false}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] px-4 text-center">
            <MapPin className="mb-2 h-8 w-8 text-[var(--color-accent-start)]/25" />
            <p className="font-courier text-[10px] leading-relaxed text-white/35">
              Pas de tracé cartographique pour ces étapes.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onCloseFlip}
          className="absolute left-3 top-3 z-30 rounded-xl bg-black/55 p-1.5 text-white shadow backdrop-blur-sm"
          aria-label="Retour"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/92 via-black/55 to-transparent px-3 pb-2 pt-8">
          <div
            ref={carouselRef}
            className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            onScroll={handleCarouselScroll}
          >
            {stepsForStrip.map((step, i) => (
              <button
                key={`${step.slug}-${i}`}
                type="button"
                onClick={() => scrollToStep(i)}
                className={`relative shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                  activeStep === i
                    ? "ring-2 ring-[var(--color-accent-start)] ring-offset-1 ring-offset-black/40"
                    : "opacity-60 hover:opacity-90"
                }`}
                style={{ width: "72px", height: "100px" }}
              >
                <CityPhoto
                  stepId={step.slug}
                  ville={step.nom}
                  alt={step.nom}
                  className="absolute inset-0 h-full w-full object-cover"
                  imageLoading="lazy"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 py-1 text-center font-title text-[9px] font-bold leading-tight text-white">
                  {step.nom}
                </div>
              </button>
            ))}
          </div>

          <Link
            href={preparerFromStar}
            className="btn-orange-glow pointer-events-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-title text-sm font-bold uppercase tracking-wide text-white"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            Accéder au viago
          </Link>
        </div>
      </div>

      <div className="w-full shrink-0 border-t border-white/8 bg-[var(--color-bg-main)] px-3 py-3 pb-6">
        {stepsForStrip[activeStep] && (
          <Link
            href={withReturnTo(
              `/inspirer/ville/${stepsForStrip[activeStep].slug}?from=stars&region=${itinerary.regionId}`,
              currentLocation
            )}
            className="mb-3 flex min-w-0 items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-2 py-1.5 transition hover:bg-white/8"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-start)]" />
            <span className="min-w-0 truncate font-title text-xs font-bold text-white/90">
              {stepsForStrip[activeStep].nom}
            </span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/25" />
          </Link>
        )}

        <p className="font-title text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/90">
          Le voyage
        </p>
        <p className="mt-1.5 font-courier text-xs leading-relaxed text-white/65">
          {itinerary.summary}
        </p>
        {itinerary.overnightStyle ? (
          <p className="mt-2 rounded-lg bg-white/4 px-2.5 py-1.5 font-courier text-[10px] italic text-white/40">
            {itinerary.overnightStyle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
