"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Compass, MapPin, Sparkles } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import type { Step } from "@/types";
import VoyageStepsMap from "@/components/VoyageStepsMap";
import { StepLieuThumb } from "@/components/StepLieuThumb";
import { buildAccueilViewModel } from "@/lib/home-content";
import AccueilEditorialBlock from "./AccueilEditorialBlock";

const UPCOMING_SCENARIOS = new Set([
  "upcoming_far",
  "upcoming_mid",
  "upcoming_soon",
  "depart_under_24h",
  "multiple_upcoming",
  "multiple_upcoming_conflict",
]);

type Props = {
  profileId: string;
  profileName: string;
};

export default function AccueilHub({ profileId, profileName }: Props) {
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewModel = buildAccueilViewModel({ state, profileId, profileName });
  const tripDaySteps = toTripDaySteps(state);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-[var(--color-bg-main)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  /**
   * Demande user : « la page d'accueil reste scrollable pour beaucoup alors
   * que ça ne devrait pas être le cas ». On force donc une hauteur EXACTE
   * (100dvh - bottom-nav 4rem) et `overflow-hidden` pour tous les layouts
   * sauf `onTrip` — celui-ci contient la fiche du jour, la mini-map et la
   * liste des étapes, qui ne peuvent pas tenir dans un seul écran sans
   * scroll interne.
   */
  const scrollable = viewModel.layout === "onTrip";

  return (
    <main
      className={`relative flex w-full flex-col bg-[var(--color-bg-main)] ${
        scrollable ? "min-h-[calc(100dvh-4rem)] overflow-y-auto" : "h-[calc(100dvh-4rem)] overflow-hidden"
      }`}
    >
      <AccueilBackground
        variant={viewModel.background}
        stepId={state?.stepsDuJour?.[0]?.id}
        stepName={state?.stepsDuJour?.[0]?.nom}
      />

      <div
        className={`relative z-10 flex min-w-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] ${
          scrollable ? "min-h-[calc(100dvh-4rem)]" : "h-full"
        }`}
      >
        <div className={`flex shrink-0 ${viewModel.layout === "onTrip" ? "justify-start" : "justify-center"} pt-1`}>
          {/**
           * Logo colorisé via MASQUE CSS et non via filtre :
           * `sepia()/hue-rotate()` ne peut pas recolorer un PNG dont les pixels
           * sont NOIRS (sepia d'un pixel #000 reste #000 → logo qui reste noir).
           * Avec `mask-image`, le PNG ne sert plus qu'à découper un gradient
           * accent peint dessous : le logo prend la couleur de l'ambiance active.
           *
           * Dans les scénarios upcoming (compte à rebours), on réduit le logo
           * pour laisser place au « J-X » central.
           */}
          <div
            aria-hidden
            className={
              viewModel.layout === "onTrip"
                ? "h-[5.5rem] w-[15rem]"
                : UPCOMING_SCENARIOS.has(viewModel.scenarioId)
                  ? "h-[6rem] w-[13rem]"
                  : "h-[min(48vw,16rem)] w-[min(56vw,20rem)]"
            }
            style={{
              WebkitMaskImage: "url(/A1.png)",
              maskImage: "url(/A1.png)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              background:
                "linear-gradient(135deg, var(--color-accent-start), var(--color-accent-mid, var(--color-accent-start)), var(--color-accent-end))",
              filter:
                "drop-shadow(0 12px 40px color-mix(in srgb, var(--color-accent-start) 55%, transparent))",
            }}
          />
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            viewModel.layout === "onTrip" ? "justify-start py-5" : "justify-center py-4"
          }`}
        >
          {UPCOMING_SCENARIOS.has(viewModel.scenarioId) ? (
            <UpcomingCountdownHero
              daysLeft={state?.joursRestants ?? 0}
              hoursLeft={state?.hoursUntilNextTripStart ?? 0}
              viewModel={viewModel}
            />
          ) : (
            <HeroSlotRenderer
              state={state}
              viewModel={viewModel}
              daySteps={tripDaySteps}
            />
          )}
        </div>

        <AccueilEditorialBlock
          thought={viewModel.dailyThought}
          editorialCard={viewModel.editorialCard}
          compact={viewModel.layout === "onTrip"}
        />
      </div>
    </main>
  );
}

function toTripDaySteps(state: VoyageStateResponse | null): Step[] {
  return (state?.stepsDuJour ?? []).map((step) => ({
    id: step.id,
    nom: step.nom,
    coordonnees: { lat: step.lat, lng: step.lng },
    date_prevue: "",
    description_culture: step.description,
    budget_prevu: 0,
    contenu_voyage: { photos: [] },
  }));
}

function AccueilBackground({
  variant,
  stepId,
  stepName,
}: {
  variant: "video" | "return" | "road";
  stepId?: string;
  stepName?: string;
}) {
  if (variant === "road") {
    return (
      <div className="absolute inset-0 min-h-[calc(100dvh-4rem)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#6d513f_0%,#312623_48%,#191514_100%)]" />
        {stepId && stepName ? (
          <div className="absolute inset-x-0 top-0 h-[34vh] overflow-hidden opacity-45">
            <StepLieuThumb
              stepId={stepId}
              nom={stepName}
              className="h-full w-full object-cover"
              roundedClassName="rounded-none"
            />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[var(--color-bg-main)]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 min-h-[calc(100dvh-4rem)]">
      <video
        src="/A2.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="h-full min-h-[calc(100dvh-4rem)] w-full object-cover opacity-35"
        style={{ filter: "grayscale(100%) contrast(1.05)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "return"
              ? `linear-gradient(
                  to bottom,
                  rgba(20, 14, 12, 0.62) 0%,
                  rgba(20, 14, 12, 0.22) 35%,
                  rgba(20, 14, 12, 0.82) 100%
                )`
              : `linear-gradient(
                  to bottom,
                  color-mix(in srgb, var(--color-bg-main) 28%, transparent) 0%,
                  transparent 40%,
                  color-mix(in srgb, var(--color-bg-main) 55%, transparent) 100%
                )`,
        }}
      />
      <div className="hero-accueil-warm-overlay absolute inset-0" />
    </div>
  );
}

function HeroSlotRenderer({
  state,
  viewModel,
  daySteps,
}: {
  state: VoyageStateResponse | null;
  viewModel: ReturnType<typeof buildAccueilViewModel>;
  daySteps: Step[];
}) {
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  if (viewModel.layout === "onTrip" && state?.voyageEnCours) {
    return (
      <div className="space-y-4">
        {/*
         * Eyebrow + headline de l'accueil → police titre (user : « à
         * venir », « plusieurs voyages t'attendent », « pensée du
         * jour » doivent sortir du corps de texte).
         */}
        {viewModel.eyebrow ? (
          <p className="font-title text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-accent-start)]/95">
            {viewModel.eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-[95%] font-title text-[2rem] font-bold leading-[1.02] tracking-tight text-white">
          {viewModel.headline}
        </h1>
        <p className="max-w-[96%] font-courier text-sm leading-relaxed text-white/72">
          {viewModel.subheadline}
        </p>
        {viewModel.statusChip ? (
          <StatusChip>{viewModel.statusChip}</StatusChip>
        ) : null}
        {viewModel.gentleAlert ? (
          <GentleAlert>{viewModel.gentleAlert}</GentleAlert>
        ) : null}
        {viewModel.daySheet ? (
          <div className="rounded-[1.75rem] border border-white/12 bg-black/20 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-title text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-accent-start)]/90">
                  Fiche du jour
                </p>
                <h2 className="mt-1 font-title text-xl font-bold text-white">
                  {viewModel.daySheet.title}
                </h2>
                <p className="mt-1 font-courier text-xs text-white/60">
                  {viewModel.daySheet.subtitle}
                </p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-courier text-[10px] text-white/75">
                {viewModel.daySheet.notePrompt}
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {viewModel.daySheet.checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 font-courier text-xs text-white/72"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-start)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {daySteps.length > 0 && mapToken ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-black/20 backdrop-blur-md">
            <VoyageStepsMap
              steps={daySteps}
              mapboxAccessToken={mapToken}
              height={190}
              variant="premium"
              linkToVille
              voyageReturnSlug={state.voyageEnCours.id}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 pt-1">
          <CtaButton cta={viewModel.primaryCta} />
          {viewModel.secondaryCta ? <CtaButton cta={viewModel.secondaryCta} /> : null}
        </div>
        {state.stepsDuJour?.length ? (
          <div className="rounded-[1.5rem] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur-sm">
            <p className="font-title text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
              Étapes du jour
            </p>
            <div className="mt-3 space-y-2">
              {state.stepsDuJour.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-start)]/18">
                    <MapPin className="h-4 w-4 text-[var(--color-accent-start)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-title text-base font-bold text-white">
                      {step.nom}
                    </p>
                    <p className="truncate font-courier text-[11px] text-white/52">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {viewModel.eyebrow ? (
        <p className="font-title text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-accent-start)]">
          {viewModel.eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-[96%] font-title text-[2.45rem] font-bold leading-[0.96] tracking-tight text-white">
        {viewModel.headline}
      </h1>
      <p className="max-w-[92%] font-courier text-sm leading-relaxed text-white/55">
        {viewModel.subheadline}
      </p>
      {viewModel.statusChip ? <StatusChip>{viewModel.statusChip}</StatusChip> : null}
      {viewModel.gentleAlert ? <GentleAlert>{viewModel.gentleAlert}</GentleAlert> : null}
      {viewModel.tripCard ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-title text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-accent-start)]/90">
                À venir
              </p>
              <p className="mt-1 font-title text-base font-bold text-white">
                {viewModel.tripCard.title}
              </p>
            </div>
            {viewModel.tripCard.badge ? (
              <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 font-courier text-[10px] text-white/72">
                {viewModel.tripCard.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-courier text-xs leading-relaxed text-white/58">
            {viewModel.tripCard.detail}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <CtaButton cta={viewModel.primaryCta} />
        {viewModel.secondaryCta ? <CtaButton cta={viewModel.secondaryCta} /> : null}
      </div>
    </div>
  );
}

/**
 * Hero « compte à rebours » central pour les scénarios `upcoming_*`.
 * Demande user : « le compte à rebours n'a toujours pas été fait
 * un élément central ». Ici on le promeut en hero : grand nombre J-X,
 * titre du voyage en dessous, subline + CTA du view-model.
 */
function UpcomingCountdownHero({
  daysLeft,
  hoursLeft,
  viewModel,
}: {
  daysLeft: number;
  hoursLeft: number;
  viewModel: ReturnType<typeof buildAccueilViewModel>;
}) {
  const underDay = daysLeft <= 0 || hoursLeft > 0 && hoursLeft < 24;
  const bigNumber = underDay ? Math.max(0, Math.floor(hoursLeft)) : Math.max(0, daysLeft);
  const unitLabel = underDay
    ? bigNumber === 1
      ? "heure avant le départ"
      : "heures avant le départ"
    : bigNumber === 1
      ? "jour avant le départ"
      : "jours avant le départ";

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {viewModel.eyebrow ? (
        <p className="font-title text-xs font-bold uppercase tracking-[0.4em] text-[var(--color-accent-start)]">
          {viewModel.eyebrow}
        </p>
      ) : null}

      <div className="flex flex-col items-center">
        <span
          className="font-title text-[6rem] font-bold leading-none tracking-tight text-white sm:text-[7rem]"
          style={{
            textShadow:
              "0 0 32px color-mix(in srgb, var(--color-accent-start) 45%, transparent)",
          }}
        >
          {`J-${bigNumber}`}
        </span>
        <span className="mt-2 font-title text-[11px] font-bold uppercase tracking-[0.32em] text-white/70">
          {unitLabel}
        </span>
      </div>

      <h1 className="max-w-[88%] font-title text-[1.8rem] font-bold leading-[1.05] tracking-tight text-white">
        {viewModel.headline}
      </h1>

      {viewModel.subheadline ? (
        <p className="max-w-[90%] font-courier text-sm leading-relaxed text-white/65">
          {viewModel.subheadline}
        </p>
      ) : null}

      {viewModel.gentleAlert ? (
        <GentleAlert>{viewModel.gentleAlert}</GentleAlert>
      ) : null}

      <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
        <CtaButton cta={viewModel.primaryCta} />
        {viewModel.secondaryCta ? <CtaButton cta={viewModel.secondaryCta} /> : null}
      </div>
    </div>
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center rounded-full border border-white/14 bg-black/18 px-3 py-1.5 font-courier text-[11px] text-white/78 backdrop-blur-sm">
      {children}
    </div>
  );
}

function GentleAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex max-w-[95%] items-start gap-2 rounded-2xl border border-[var(--color-accent-start)]/28 bg-[var(--color-accent-start)]/12 px-3 py-2 font-courier text-xs leading-relaxed text-white/84 backdrop-blur-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
      <span>{children}</span>
    </div>
  );
}

function CtaButton({ cta }: { cta: { label: string; href: string; tone: "primary" | "secondary" } }) {
  const Icon = cta.tone === "primary" ? BookOpen : cta.href.includes("/inspirer") ? Sparkles : Compass;

  return (
    <Link
      href={cta.href}
      className={
        cta.tone === "primary"
          ? "btn-orange-glow font-title inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold uppercase tracking-wide text-white"
          : "font-title inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-base font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
      }
    >
      <Icon className="h-4 w-4" />
      {cta.label}
    </Link>
  );
}
