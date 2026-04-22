"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import { withReturnTo } from "@/lib/return-to";
import dynamic from "next/dynamic";
import { MapPin, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";
import {
  cacheKeysLieuResolve,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import { tryUserValidatedPhoto } from "@/lib/client-photo-validated";
import { getClientPublicPhotoPick } from "@/lib/public-photo-client";
import { sharpenUnsplashUrl } from "@/lib/photo-display-url";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";
import { CityPhoto } from "@/components/CityPhoto";
import type { StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";

const StarFlipMap = dynamic(() => import("./StarFlipMap"), { ssr: false });

type Props = {
  itinerary: StarItineraryEditorialItem;
  onCloseFlip: () => void;
};

function StarStepStripPhoto({
  stepSlug,
  nom,
  snapReady,
}: {
  stepSlug: string;
  nom: string;
  snapReady: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const slug = useMemo(() => slugForLieuPhoto(stepSlug, nom), [stepSlug, nom]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { rootMargin: "120px", threshold: 0.01 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const syncUrl = useMemo(() => {
    if (!snapReady || !visible) return null;
    const phone = tryUserValidatedPhoto(slug, stepSlug);
    const cached = getCachedPhotoUrl(cacheKeysLieuResolve(slug, stepSlug));
    const pick = getClientPublicPhotoPick(slug, stepSlug, 0);
    return phone ?? cached ?? pick?.url ?? null;
  }, [snapReady, visible, slug, stepSlug]);

  return (
    <div ref={root} className="absolute inset-0 bg-[#222]">
      {!visible ? null : syncUrl ? (
        <>
          <img
            src={sharpenUnsplashUrl(syncUrl)}
            alt=""
            className="photo-bw-reveal h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <PhotoCurationOverlay
            slug={slug}
            photoLookupStepId={stepSlug}
            imageUrl={syncUrl}
            title={nom}
            compact
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        </>
      ) : (
        <>
          <CityPhoto
            stepId={stepSlug}
            ville={nom}
            alt={nom}
            className="absolute inset-0 h-full w-full object-cover"
            photoCuration
            curationCompact
            curationTitle={nom}
            imageLoading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        </>
      )}
    </div>
  );
}

export default function StarFlipDetail({ itinerary, onCloseFlip }: Props) {
  const currentLocation = useReturnBase();

  const [resolvedSteps, setResolvedSteps] = useState<ResolvedStarStep[] | null>(null);
  const [snapReady, setSnapReady] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPhotoValidationSnapshot().finally(() => setSnapReady(true));
  }, []);

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

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-y-auto overflow-x-hidden bg-[var(--color-bg-main)] overscroll-y-contain">
      {/* Pas de sticky : la carte défile avec le texte pour pouvoir lire le récit */}
      <div className="shrink-0 border-b border-white/6 bg-[var(--color-bg-main)]">
        <div className="relative aspect-[16/10] max-h-[min(36vh,300px)] w-full min-h-[170px] bg-[var(--color-bg-secondary)]">
          {resolvedSteps === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="h-7 w-7 rounded-full border-2 border-[var(--color-accent-start)]/20 border-t-[var(--color-accent-start)] animate-spin" />
              <p className="font-courier text-[10px] text-white/25">Carte…</p>
            </div>
          ) : mapSteps ? (
            <StarFlipMap steps={mapSteps} activeStepIndex={activeStep} mapboxToken={token} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <MapPin className="mb-2 h-8 w-8 text-[var(--color-accent-start)]/25" />
              <p className="font-courier text-[10px] leading-relaxed text-white/35">
                Pas de tracé cartographique pour ces étapes. Les photos des villes restent ci-dessous.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onCloseFlip}
            className="absolute left-3 top-3 z-30 rounded-xl bg-black/50 p-1.5 text-white/60 backdrop-blur-sm transition hover:text-white"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative shrink-0 border-b border-white/6 bg-[var(--color-bg-main)] py-3">
        <p className="mb-2 px-4 font-courier text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/70">
          Villes · défilement horizontal
        </p>
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide"
          onScroll={handleCarouselScroll}
        >
          {stepsForStrip.map((step, i) => (
            <button
              key={`${step.slug}-${i}`}
              type="button"
              onClick={() => scrollToStep(i)}
              className={`relative shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                activeStep === i
                  ? "ring-2 ring-[var(--color-accent-start)] ring-offset-1 ring-offset-[var(--color-bg-main)]"
                  : "opacity-55 hover:opacity-85"
              }`}
              style={{ width: "82px", height: "118px" }}
            >
              <StarStepStripPhoto stepSlug={step.slug} nom={step.nom} snapReady={snapReady} />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[35] p-1.5 text-center font-courier text-[9px] font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {step.nom}
              </span>
            </button>
          ))}
        </div>

        {stepsForStrip.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollToStep(Math.max(0, activeStep - 1))}
              className="absolute left-0 top-[60%] z-10 -translate-y-1/2 rounded-r-lg bg-black/40 p-1 text-white/40 backdrop-blur-sm hover:text-white"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                scrollToStep(Math.min(stepsForStrip.length - 1, activeStep + 1))
              }
              className="absolute right-0 top-[60%] z-10 -translate-y-1/2 rounded-l-lg bg-black/40 p-1 text-white/40 backdrop-blur-sm hover:text-white"
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {stepsForStrip[activeStep] && (
        <Link
          href={withReturnTo(
            `/inspirer/ville/${stepsForStrip[activeStep].slug}?from=stars&region=${itinerary.regionId}`,
            currentLocation
          )}
          className="flex shrink-0 items-center gap-2 border-b border-white/6 px-4 py-2.5 transition hover:bg-white/3"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-start)]" />
          <span className="font-courier text-sm font-bold text-white/75">
            {stepsForStrip[activeStep].nom}
          </span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/20" />
        </Link>
      )}

      <div className="px-4 py-6 pb-10">
        <p className="font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/80">
          Le voyage
        </p>
        <p className="mt-2 font-courier text-sm leading-relaxed text-white/55">{itinerary.summary}</p>
        {itinerary.overnightStyle && (
          <p className="mt-4 rounded-xl bg-white/3 px-3 py-2 font-courier text-[11px] italic text-white/35">
            {itinerary.overnightStyle}
          </p>
        )}
        <Link
          href={withReturnTo(
            `/preparer?fromStar=${itinerary.itinerarySlug}&region=${itinerary.regionId}`,
            currentLocation
          )}
          className="btn-orange-glow mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-courier text-xs font-bold text-white"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Créer mon voyage
        </Link>
      </div>
    </div>
  );
}
