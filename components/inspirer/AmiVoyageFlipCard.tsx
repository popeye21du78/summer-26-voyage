"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import dynamic from "next/dynamic";
import { MapPin, ChevronLeft, Sparkles } from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import type { Voyage } from "@/data/mock-voyages";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";
import { slugFromNom } from "@/lib/slug-from-nom";
import { withReturnTo } from "@/lib/return-to";

function buildAmiViagoReturn(here: string, voyageId: string): string {
  try {
    const u = new URL(here || "/inspirer", "http://localhost");
    u.searchParams.set("tab", "amis");
    u.searchParams.set("amiFlip", voyageId);
    return `${u.pathname}${u.search}`;
  } catch {
    return `/inspirer?tab=amis&amiFlip=${encodeURIComponent(voyageId)}`;
  }
}

const StarFlipMap = dynamic(() => import("./StarFlipMap"), { ssr: false });

class AmiMapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[140px] items-center justify-center bg-[var(--color-bg-secondary)] px-3 text-center">
          <p className="font-courier text-[10px] leading-relaxed text-white/45">
            Carte indisponible ici. Les étapes et photos restent accessibles ci-dessous.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

type Props = {
  profileId: string;
  profileName: string;
  voyage: Voyage;
};

export default function AmiVoyageFlipCard({
  profileId,
  profileName,
  voyage,
}: Props) {
  const here = useReturnBase();

  const [flipped, setFlipped] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const stepsList = Array.isArray(voyage.steps) ? voyage.steps : [];

  const resolvedSteps: ResolvedStarStep[] = stepsList
    .filter((s) => s.coordonnees?.lat != null && s.coordonnees?.lng != null)
    .map((s) => ({
      slug: s.id,
      nom: s.nom,
      lat: s.coordonnees!.lat,
      lng: s.coordonnees!.lng,
    }));

  const stepsForStrip =
    resolvedSteps.length > 0
      ? resolvedSteps
      : stepsList.map((s) => ({
          slug: s.id,
          nom: s.nom,
          lat: 0,
          lng: 0,
        }));

  const first = stepsList[0];
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const scrollToStep = useCallback((idx: number) => {
    setActiveStep(idx);
    const el = carouselRef.current;
    const child = el?.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get("amiFlip") === voyage.id) {
        raf = requestAnimationFrame(() => setFlipped(true));
      }
    } catch {
      /* ignore */
    }
    return () => cancelAnimationFrame(raf);
  }, [voyage.id]);

  const clearAmiFlipFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get("amiFlip") === voyage.id) {
        u.searchParams.delete("amiFlip");
        window.history.replaceState(null, "", `${u.pathname}${u.search}`);
      }
    } catch {
      /* ignore */
    }
  }, [voyage.id]);

  return (
    <div
      className="relative w-full"
      style={{
        perspective: "1200px",
        /** Verso plus compact pour éviter de devoir scroller immédiatement. */
        minHeight: flipped ? "min(620px, 84vh)" : undefined,
        transition: "min-height 600ms ease",
      }}
    >
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          height: flipped ? "min(620px, 84vh)" : "auto",
        }}
      >
        {/* Recto */}
        <button
          type="button"
          className="relative w-full cursor-pointer overflow-hidden rounded-2xl border border-white/6 text-left shadow-lg shadow-black/30"
          style={{ backfaceVisibility: "hidden" }}
          onClick={() => setFlipped(true)}
        >
          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[var(--color-bg-secondary)]">
            {first ? (
              <CityPhoto
                stepId={first.id}
                ville={first.nom}
                alt={voyage.titre}
                initialUrl={first.contenu_voyage?.photos?.[0]}
                className="absolute inset-0 h-full w-full object-cover"
                imageLoading="lazy"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <Link
                href={`/profil/${profileId}`}
                onClick={(e) => e.stopPropagation()}
                className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 font-courier text-[10px] font-bold text-white/90 backdrop-blur-sm transition hover:bg-black/60"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-start)] text-[10px]">
                  {(profileName?.trim()?.charAt(0) || "?").toUpperCase()}
                </span>
                {profileName}
              </Link>
              <p className="font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-start)]">
                Voyage d’un ami
              </p>
              <h3 className="mt-1 font-courier text-lg font-bold leading-tight text-white">
                {voyage.titre}
              </h3>
              <p className="mt-1 line-clamp-2 font-courier text-xs text-white/45">
                {voyage.sousTitre}
              </p>
              <p className="mt-2 font-courier text-[10px] text-white/35">
                {voyage.dateDebut
                  ? new Date(voyage.dateDebut).toLocaleDateString("fr-FR")
                  : ""}{" "}
                · {stepsList.length} étapes
              </p>
            </div>
          </div>
        </button>

        {/*
         * Verso : le recto contraint la hauteur (aspect 3/4). Si le contenu dépasse,
         * on scrolle À L'INTÉRIEUR du verso (h-full + overflow-y-auto) pour que le
         * bouton « Accéder au Viago » reste toujours atteignable.
         */}
        <div
          className="absolute inset-0 w-full overflow-hidden rounded-2xl border border-white/6 bg-[var(--color-bg-main)] shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="shrink-0 border-b border-white/6 bg-[var(--color-bg-main)]">
              <div className="relative aspect-[2/1] min-h-[120px] w-full max-h-[min(28vh,260px)]">
                {flipped && resolvedSteps.length > 0 && token ? (
                  <AmiMapErrorBoundary>
                    <StarFlipMap
                      steps={resolvedSteps}
                      activeStepIndex={activeStep}
                      mapboxToken={token}
                    />
                  </AmiMapErrorBoundary>
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--color-bg-secondary)]">
                    <MapPin className="h-10 w-10 text-[var(--color-accent-start)]/20" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearAmiFlipFromUrl();
                    setActiveStep(0);
                    setFlipped(false);
                  }}
                  className="absolute left-3 top-3 z-30 rounded-xl bg-black/50 p-1.5 text-white/70 backdrop-blur-sm"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative border-b border-white/6 bg-[var(--color-bg-main)] py-3">
              <p className="mb-2 px-4 font-courier text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/70">
                Étapes
              </p>
              <div
                ref={carouselRef}
                className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide"
              >
                {stepsForStrip.map((step, i) => (
                  <button
                    key={`${step.slug}-${i}`}
                    type="button"
                    onClick={() => scrollToStep(i)}
                    className={`relative shrink-0 overflow-hidden rounded-xl ${
                      activeStep === i
                        ? "ring-2 ring-[var(--color-accent-start)]"
                        : "opacity-60 hover:opacity-90"
                    }`}
                    style={{ width: "72px", height: "100px" }}
                  >
                    <CityPhoto
                      stepId={step.slug}
                      ville={step.nom}
                      alt={step.nom}
                      className="absolute inset-0 h-full w-full object-cover"
                      initialUrl={
                        stepsList.find((s) => s.id === step.slug)?.contenu_voyage
                          ?.photos?.[0]
                      }
                      imageLoading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 text-center font-courier text-[8px] font-bold text-white">
                      {step.nom}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 space-y-3 px-4 py-3">
              <Link
                href={withReturnTo(
                  `/inspirer/ville/${slugFromNom(stepsForStrip[activeStep]?.nom ?? "")}?from=amis`,
                  here
                )}
                className="flex items-center gap-2 font-courier text-sm font-bold text-[var(--color-accent-start)] hover:underline"
              >
                <MapPin className="h-4 w-4" />
                Voir {stepsForStrip[activeStep]?.nom ?? "la ville"}
              </Link>
              <Link
                href={withReturnTo(
                  `/mon-espace/viago/${voyage.id}?mode=readonly`,
                  buildAmiViagoReturn(here, voyage.id)
                )}
                className="btn-orange-glow flex w-full items-center justify-center gap-2 rounded-xl py-3 font-courier text-sm font-bold text-white"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                Accéder au Viago
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
