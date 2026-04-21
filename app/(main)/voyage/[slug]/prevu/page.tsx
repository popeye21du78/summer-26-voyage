"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fuel, Route, User, ChevronDown, BarChart3, MapPin } from "lucide-react";
import VoyageStepsMap from "../../../../../components/VoyageStepsMap";
import { StepLieuThumb } from "../../../../../components/StepLieuThumb";
import { mergeVoyageSteps } from "../../../../../lib/voyage-local-overrides";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function VoyagePrevuInner() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<{
    voyage: any;
    isOwner: boolean;
    ownerName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    fetch(`/api/voyage/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const { isOwner, ownerName, ownerProfileId, ...voyage } = data;
          setData({ voyage, isOwner: isOwner ?? true, ownerName });
          setShowDetails(data.isOwner);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  /** Empêche le scroll de page : carte fixe en haut, liste scrollable en bas */
  useEffect(() => {
    if (!data || loading) return;
    const allow = data.isOwner || showDetails;
    if (!allow) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [data, loading, showDetails]);

  const mergedSteps = useMemo(() => {
    if (!data?.voyage?.steps) return [];
    return mergeVoyageSteps(data.voyage.steps, data.voyage.id);
  }, [data]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  if (loading) {
    return (
      <main className="page-under-header flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-under-header flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="font-courier text-[#333333]/80">Voyage introuvable.</p>
        <Link
          href="/accueil"
          className="font-courier font-bold text-[var(--color-accent-start)] underline transition hover:no-underline"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const { voyage, isOwner, ownerName } = data;
  const voyageForMap = { ...voyage, steps: mergedSteps };
  if (!isOwner && !showDetails) {
    return (
      <main className="page-under-header flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-mid)] text-4xl text-white">
              <User className="h-12 w-12" />
            </div>
          </div>
          <h1 className="mb-2 font-courier text-2xl font-bold tracking-wider text-[#333333] md:text-3xl">
            Voyage de {ownerName}
          </h1>
          <p className="mb-6 font-courier text-lg font-bold text-[var(--color-accent-start)]">
            {voyage.titre}
          </p>
          <p className="mb-8 font-courier text-[#333333]/80">
            Vous consultez le voyage d&apos;un ami. Lecture seule — pas de
            modification possible.
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="btn-terracotta inline-flex items-center gap-2 rounded-[50px] border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-8 py-4 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[var(--color-accent-start)]/50"
          >
            Voir le voyage
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const statsMini =
    voyage.stats &&
    (voyage.stats.km != null ||
      voyage.stats.essence != null ||
      voyage.stats.budget != null);

  return (
    <main className="box-border flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden overscroll-none bg-[#FAF4F0] pt-0">
      <section
        id="carte-voyage"
        className="relative z-10 h-[36dvh] min-h-[150px] w-full shrink-0 overflow-hidden md:h-[min(380px,38vh)]"
      >
        <VoyageStepsMap
          steps={voyageForMap.steps}
          mapboxAccessToken={token}
          linkToVille={isOwner}
          voyageReturnSlug={slug}
          fillHeight
          height={420}
          variant="fullBleed"
          showRecenter={!!token && voyageForMap.steps.length > 0}
        />
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <section className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] md:mx-auto md:max-w-2xl">
        {/* Titre persistant + bandeau qui fond le contenu qui remonte sous la carte */}
        <div className="sticky top-0 z-30 border-b border-[var(--color-accent-start)]/10 bg-[#FAF4F0] shadow-sm">
          <div className="px-4 pb-3 pt-2 md:px-4">
            <h1 className="font-courier text-lg font-bold leading-tight text-[#333333] md:text-xl">
              {voyage.titre}
            </h1>
            {voyage.sousTitre ? (
              <p className="mt-1 line-clamp-2 text-xs text-[#333333]/70 md:text-sm">
                {voyage.sousTitre}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative z-0 px-4 pb-2 pt-1 md:px-4">
        {!isOwner && ownerName && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--color-accent-start)]/20 bg-white/70 px-2.5 py-1.5 text-[11px] text-[#333333] md:text-xs">
            <User className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-start)]" />
            <span>
              Voyage de <strong>{ownerName}</strong> — lecture seule
            </span>
          </div>
        )}
      <ul className="mb-6 space-y-1.5">
        {mergedSteps.map((s: any, i: number) => {
          const nuit = s.nuitee_type;
          const nuitLabel =
            nuit === "airbnb"
              ? "Airbnb"
              : nuit === "passage"
                ? "Passage"
                : "Van";
          const villeHref = `/ville/${s.id}?v=${encodeURIComponent(slug)}`;
          const rowClass = `group flex min-h-[52px] items-center gap-2 overflow-hidden rounded-lg border border-[var(--color-accent-start)]/15 bg-white/90 pr-2 shadow-sm ${
            isOwner ? "transition-all hover:border-[var(--color-accent-start)]/40 hover:shadow-md" : "cursor-default"
          }`;
          const inner = (
            <>
              <div className="flex w-8 shrink-0 flex-col items-center justify-center border-r border-[var(--color-accent-start)]/15 bg-[#FFF2EB]/80 py-1 text-[10px] font-black text-[var(--color-accent-end)]">
                {i + 1}
              </div>
              <StepLieuThumb
                stepId={s.id}
                nom={s.nom}
                className="h-11 w-11 shrink-0 transition-transform group-hover:scale-105"
                roundedClassName="rounded-md"
              />
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate font-courier text-sm font-bold text-[#333333]">
                  {s.nom}
                </p>
                <p className="truncate font-courier text-[10px] text-[#333333]/65">
                  {formatDate(s.date_prevue)} · {nuitLabel}
                </p>
              </div>
              {isOwner && (
                <MapPin className="mr-1 h-4 w-4 shrink-0 text-[var(--color-accent-start)]/60 transition group-hover:text-[var(--color-accent-start)]" aria-hidden />
              )}
            </>
          );
          return (
            <li key={s.id}>
              {isOwner ? (
                <Link href={villeHref} className={rowClass}>
                  {inner}
                </Link>
              ) : (
                <div className={rowClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
        </div>

        </section>

        <nav
          className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--color-accent-start)]/20 bg-[#FAF4F0]/98 px-3 py-1.5 text-[10px] text-[#333333] shadow-[0_-4px_16px_rgba(80,40,20,0.06)] backdrop-blur-sm md:mx-auto md:max-w-2xl md:px-4"
          aria-label="Actions voyage"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
            {statsMini && (
              <>
                {voyage.stats.km != null && (
                  <span className="inline-flex items-center gap-0.5 font-courier font-bold">
                    <Route className="h-3 w-3 text-[var(--color-accent-start)]" aria-hidden />
                    {voyage.stats.km} km
                  </span>
                )}
                {voyage.stats.essence != null && (
                  <span className="inline-flex items-center gap-0.5 font-courier font-bold">
                    <Fuel className="h-3 w-3 text-[var(--color-accent-start)]" aria-hidden />
                    {voyage.stats.essence} €
                  </span>
                )}
                {voyage.stats.budget != null && (
                  <span className="font-courier font-bold">💰 {voyage.stats.budget} €</span>
                )}
              </>
            )}
            {!statsMini && (
              <span className="text-[#333333]/55">{mergedSteps.length} étape{mergedSteps.length > 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={`/voyage/${slug}/termine#voyage-stats`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-start)]/40 bg-white/90 px-2.5 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-end)] shadow-sm transition hover:bg-[#FFF8F0] sm:px-3"
            >
              <BarChart3 className="h-3 w-3 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
              Stats
            </Link>
            <Link
              href={
                isOwner
                  ? `/viago/${voyage.id}?from=prevu`
                  : `/viago/${voyage.id}?mode=readonly&from=prevu`
              }
              className="rounded-full bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-3 py-1 font-courier text-[10px] font-bold text-white shadow-sm transition hover:opacity-95"
            >
              Viago
            </Link>
            <Link
              href="/accueil"
              className="rounded-full border border-[var(--color-accent-start)]/35 px-3 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-end)] transition hover:bg-white/70"
            >
              Menu
            </Link>
          </div>
        </nav>
      </div>
    </main>
  );
}

export default function VoyagePrevuPage() {
  return (
    <Suspense
      fallback={
        <main className="page-under-header flex min-h-[50vh] items-center justify-center px-4">
          <p className="font-courier text-[#333333]/70">Chargement…</p>
        </main>
      }
    >
      <VoyagePrevuInner />
    </Suspense>
  );
}
