"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import dynamic from "next/dynamic";
import { MapPin, ChevronLeft, Sparkles } from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import type { Voyage } from "@/data/mock-voyages";
import type { ResolvedStarStep } from "@/lib/inspiration/star-itinerary-geo";
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

/** Boundary global à la carte — isole un crash verso (map, carousel, lien) du reste de la page. */
class AmiCardErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] px-5 py-6 text-center">
          <p className="font-courier text-[11px] text-white/60">
            Impossible d’afficher ce voyage. Touche pour réessayer.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
            className="rounded-full border border-[var(--color-accent-start)]/50 px-3 py-1 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AmiVoyageFlipCard(props: Props) {
  return (
    <AmiCardErrorBoundary>
      <AmiVoyageFlipCardInner {...props} />
    </AmiCardErrorBoundary>
  );
}

function AmiVoyageFlipCardInner({
  profileId,
  profileName,
  voyage,
}: Props) {
  const here = useReturnBase();

  const [flipped, setFlipped] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const stepsList = Array.isArray(voyage?.steps) ? voyage.steps : [];
  const safeProfileName =
    typeof profileName === "string" && profileName.trim().length > 0
      ? profileName
      : "Viago";

  const resolvedSteps: ResolvedStarStep[] = stepsList
    .filter(
      (s) =>
        s?.coordonnees &&
        typeof s.coordonnees.lat === "number" &&
        typeof s.coordonnees.lng === "number" &&
        Number.isFinite(s.coordonnees.lat) &&
        Number.isFinite(s.coordonnees.lng)
    )
    .map((s) => ({
      slug: s.id,
      nom: s.nom ?? "",
      lat: s.coordonnees!.lat,
      lng: s.coordonnees!.lng,
    }));

  const stepsForStrip =
    resolvedSteps.length > 0
      ? resolvedSteps
      : stepsList.map((s) => ({
          slug: s?.id ?? "",
          nom: s?.nom ?? "",
          lat: 0,
          lng: 0,
        }));

  /** Clamp activeStep pour éviter `stepsForStrip[huge]` = undefined sur une carte mal sourcée. */
  const safeActiveStep = stepsForStrip.length
    ? Math.min(Math.max(activeStep, 0), stepsForStrip.length - 1)
    : 0;

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
      }}
    >
      {/**
       * Verso = même format (aspect 3/4) que le recto — la demande user est
       * explicite : la carte « se flippe » simplement, elle ne bascule pas
       * vers un layout vertical avec villes sous le bouton. On contraint
       * donc l'extérieur à aspect [3/4] et le verso remplit la même box.
       */}
      <div
        className="relative w-full aspect-[3/4] transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Recto */}
        <button
          type="button"
          className="absolute inset-0 cursor-pointer overflow-hidden rounded-2xl border border-white/6 text-left shadow-lg shadow-black/30"
          style={{ backfaceVisibility: "hidden" }}
          onClick={() => setFlipped(true)}
        >
          <div className="relative h-full w-full overflow-hidden bg-[var(--color-bg-secondary)]">
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
                  {(safeProfileName.charAt(0) || "?").toUpperCase()}
                </span>
                {safeProfileName}
              </Link>
              <p className="font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-start)]">
                Voyage d’un ami
              </p>
              <h3 className="font-title mt-1 text-2xl font-bold uppercase leading-tight tracking-wide text-white">
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
         * Verso : la CARTE remplit la totalité de la carte et ses MARQUEURS
         * de villes sont affichés directement dessus (StarFlipMap). Au-dessus
         * de la carte, en overlay, on pose : le bouton retour, une petite
         * strip de vignettes villes (sélecteur d'étape), et le CTA « Voir le
         * viago ». Plus aucun contenu n'est déporté SOUS la carte — la
         * demande user était explicite : « la carte doit juste se flipper
         * et garder le même format ».
         */}
        <div
          className="absolute inset-0 w-full overflow-hidden rounded-2xl border border-white/6 bg-[var(--color-bg-main)] shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="absolute inset-0">
            {flipped && resolvedSteps.length > 0 && token ? (
              <AmiMapErrorBoundary>
                <StarFlipMap
                  steps={resolvedSteps}
                  activeStepIndex={safeActiveStep}
                  mapboxToken={token}
                  // Overlay bas = vignettes villes (~88px) + gap + CTA (~48px) + padding (16px) ≈ 180px.
                  // On pousse à 200 pour que la route finisse TOUJOURS au-dessus des vignettes
                  // (user : « le voyage s'achève sous les cartes des villes »).
                  bottomInsetPx={200}
                  topInsetPx={48}
                />
              </AmiMapErrorBoundary>
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--color-bg-secondary)]">
                <MapPin className="h-10 w-10 text-[var(--color-accent-start)]/20" />
              </div>
            )}
          </div>

          {/* Bouton retour en haut à gauche */}
          <button
            type="button"
            onClick={() => {
              clearAmiFlipFromUrl();
              setActiveStep(0);
              setFlipped(false);
            }}
            className="absolute left-3 top-3 z-30 rounded-xl bg-black/55 p-1.5 text-white shadow backdrop-blur-sm"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/*
           * Bande bas : vignettes villes + CTA viago en overlay sur la
           * carte. Dégradé renforcé (from-black/90 via-black/55 jusqu'à
           * transparent) pour harmoniser avec la section Stars et
           * garantir la lisibilité des vignettes même sur fond clair.
           */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/92 via-black/55 to-transparent px-3 pb-3 pt-8">
            <div
              ref={carouselRef}
              className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            >
              {stepsForStrip.map((step, i) => (
                <button
                  key={`${step.slug || "step"}-${i}`}
                  type="button"
                  onClick={() => scrollToStep(i)}
                  className={`relative shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                    safeActiveStep === i
                      ? "ring-2 ring-[var(--color-accent-start)] ring-offset-1 ring-offset-black/40"
                      : "opacity-60 hover:opacity-90"
                  }`}
                  /**
                   * Vignettes agrandies (user : « augmente un peu la
                   * taille de ces cartes ») : 72x100 — aligné sur la
                   * strip StarFlipDetail pour harmoniser le visuel
                   * avec la section Stars.
                   */
                  style={{ width: "72px", height: "100px" }}
                >
                  <CityPhoto
                    stepId={step.slug || `ami-${i}`}
                    ville={step.nom || ""}
                    alt={step.nom || ""}
                    className="absolute inset-0 h-full w-full object-cover"
                    initialUrl={
                      stepsList.find((s) => s?.id === step.slug)?.contenu_voyage
                        ?.photos?.[0]
                    }
                    imageLoading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 py-1 text-center font-courier text-[9px] font-bold leading-tight text-white">
                    {step.nom || "—"}
                  </div>
                </button>
              ))}
            </div>

            <Link
              href={withReturnTo(
                `/mon-espace/viago/${voyage.id}?mode=readonly`,
                buildAmiViagoReturn(here, voyage.id)
              )}
              className="btn-orange-glow pointer-events-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-courier text-sm font-bold text-white"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Voir le viago
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
