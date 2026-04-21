"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Footprints,
  Camera,
  CalendarDays,
  MapPin,
  Euro,
  Sparkles,
} from "lucide-react";
import { EDITORIAL_PROFILES, getProfileById } from "@/data/test-profiles";
import {
  collectPersonaVoyages,
  getVoyageForProfile,
} from "@/data/mock-voyages";
import { starItinerariesForEditorialProfile } from "@/content/inspiration/star-itineraries-editorial";
import { readReturnTo } from "@/lib/return-to";
import LinkWithReturn from "@/components/LinkWithReturn";
import AmiVoyageFlipCard from "@/components/inspirer/AmiVoyageFlipCard";

export default function ProfilPublicPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [returnBack, setReturnBack] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setReturnBack(readReturnTo(sp));
  }, []);

  const profile = useMemo(() => getProfileById(id), [id]);
  const isEditorial = useMemo(
    () => EDITORIAL_PROFILES.some((p) => p.id === id),
    [id]
  );
  const state = useMemo(() => (profile ? getVoyageForProfile(profile.id) : null), [profile]);

  const voyagesFull = useMemo(() => {
    if (!state) return [];
    return collectPersonaVoyages(state);
  }, [state]);

  const starPick = useMemo(
    () => (isEditorial ? starItinerariesForEditorialProfile(id) : []),
    [isEditorial, id]
  );

  /** Agrège toutes les métriques en une seule passe — évite plusieurs useMemo en cascade. */
  const metrics = useMemo(() => {
    const regions = new Set<string>();
    let totalSteps = 0;
    let totalDays = 0;
    let totalPhotos = 0;
    let totalBudget = 0;
    let totalKm = 0;
    const regionCount: Record<string, number> = {};

    for (const v of voyagesFull) {
      if (v.region) {
        regions.add(v.region);
        regionCount[v.region] = (regionCount[v.region] ?? 0) + 1;
      }
      totalSteps += v.steps.length;
      totalDays += v.dureeJours ?? 0;
      totalBudget += v.stats?.budget ?? 0;
      totalKm += v.stats?.km ?? 0;
      for (const s of v.steps) {
        totalPhotos += s.contenu_voyage?.photos?.length ?? 0;
      }
    }

    const topRegion =
      Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      voyages: voyagesFull.length,
      regions: regions.size,
      steps: totalSteps,
      days: totalDays,
      photos: totalPhotos,
      budget: totalBudget,
      km: totalKm,
      topRegion,
      regionList: Object.entries(regionCount).sort((a, b) => b[1] - a[1]),
    };
  }, [voyagesFull]);

  if (!profile) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-[var(--color-bg-main)] px-6">
        <p className="font-courier text-sm text-[var(--color-text-secondary)]">
          Profil introuvable.
        </p>
        <Link
          href="/mon-espace"
          className="mt-4 font-courier text-xs font-bold text-[var(--color-accent-start)]"
        >
          Mon espace
        </Link>
      </main>
    );
  }

  const defaultBack = isEditorial ? "/inspirer?tab=stars" : "/mon-espace";

  return (
    <main className="min-h-full overflow-y-auto bg-[var(--color-bg-main)] pb-bottom-nav">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-main)]/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href={returnBack ?? defaultBack}
          className="flex items-center gap-1 font-courier text-xs font-bold text-[var(--color-accent-start)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      {/* Hero profil : fond dégradé accent, avatar + chiffres clés */}
      <section className="relative overflow-hidden border-b border-[var(--color-glass-border)] px-5 pb-6 pt-8">
        <div
          className="pointer-events-none absolute inset-0 -z-[1] opacity-40"
          style={{
            background:
              "radial-gradient(80% 60% at 20% 0%, color-mix(in srgb, var(--color-accent-start) 35%, transparent) 0%, transparent 70%), radial-gradient(60% 50% at 80% 40%, color-mix(in srgb, var(--color-accent-end) 28%, transparent) 0%, transparent 72%)",
          }}
        />
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-courier text-3xl font-bold text-white shadow-[0_14px_34px_var(--color-shadow-cta-accent),0_4px_12px_var(--color-shadow)]"
            style={{ background: "var(--gradient-cta)" }}
          >
            {profile.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="font-courier text-[1.75rem] font-bold leading-tight text-[var(--color-text-primary)]">
              {profile.name}
            </h1>
            <p className="mt-1 font-courier text-sm text-[var(--color-text-secondary)]">
              {profile.situationLabel}
            </p>
            {metrics.topRegion && (
              <p className="mt-1 inline-flex items-center gap-1 font-courier text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-start)]">
                <Sparkles className="h-3 w-3" />
                {metrics.topRegion}
              </p>
            )}
          </div>
        </div>

        {/* Grille d'indicateurs principaux */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile icon={Compass} label="Voyages" value={metrics.voyages} />
          <StatTile icon={MapPin} label="Régions" value={metrics.regions} />
          <StatTile icon={Footprints} label="Étapes" value={metrics.steps} />
          <StatTile icon={CalendarDays} label="Jours" value={metrics.days} />
        </div>

        {/* Seconde ligne d'indicateurs (km, budget, photos, stars) */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {metrics.km > 0 && (
            <StatTile
              icon={Compass}
              label="Kilomètres"
              value={`${Math.round(metrics.km)} km`}
              subtle
            />
          )}
          {metrics.budget > 0 && (
            <StatTile
              icon={Euro}
              label="Budget"
              value={`${Math.round(metrics.budget)} €`}
              subtle
            />
          )}
          {metrics.photos > 0 && (
            <StatTile icon={Camera} label="Photos" value={metrics.photos} subtle />
          )}
          {isEditorial && starPick.length > 0 && (
            <StatTile icon={Sparkles} label="Stars" value={starPick.length} subtle />
          )}
        </div>
      </section>

      {/* Mes voyages — défilement horizontal */}
      <section className="px-5 pt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
            Mes voyages
          </h2>
          <span className="font-courier text-[10px] text-[var(--color-text-secondary)]">
            {voyagesFull.length} au total
          </span>
        </div>
        {voyagesFull.length === 0 ? (
          <p className="font-courier text-sm text-[var(--color-text-secondary)]">
            Aucun voyage à afficher.
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto overflow-y-hidden scrollbar-none">
            <div className="flex snap-x snap-mandatory gap-5 px-5 pb-3">
              {voyagesFull.map((v) => (
                <div
                  key={v.id}
                  className="snap-start shrink-0 basis-[86%] sm:basis-[420px]"
                >
                  <AmiVoyageFlipCard
                    profileId={profile.id}
                    profileName={profile.name}
                    voyage={v}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Régions visitées */}
      {metrics.regionList.length > 0 && (
        <section className="px-5 pt-10">
          <h2 className="mb-4 font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
            Régions traversées
          </h2>
          <div className="flex flex-wrap gap-2">
            {metrics.regionList.map(([reg, count]) => (
              <div
                key={reg}
                className="flex items-center gap-2 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] px-3 py-1.5 font-courier text-xs text-[var(--color-text-primary)] backdrop-blur-md"
              >
                <MapPin className="h-3 w-3 text-[var(--color-accent-start)]" />
                <span className="font-bold">{reg}</span>
                <span className="rounded-full bg-[var(--color-accent-start)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent-start)]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Itinéraires Stars liés */}
      {isEditorial && starPick.length > 0 && (
        <section className="px-5 pt-10">
          <h2 className="mb-1 font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
            Itinéraires Stars associés
          </h2>
          <p className="mb-4 font-courier text-xs text-[var(--color-text-secondary)]">
            Ses manières de voyager, reprises dans la sélection Stars.
          </p>
          <ul className="flex flex-col gap-2">
            {starPick.slice(0, 12).map((it) => (
              <li key={`${it.regionId}-${it.itinerarySlug}`}>
                <LinkWithReturn
                  href={`/inspirer?tab=stars&region=${encodeURIComponent(it.regionId)}`}
                  className="flex items-start gap-2 rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] px-3.5 py-2.5 font-courier text-sm text-[var(--color-text-primary)] backdrop-blur-md transition hover:border-[var(--color-accent-start)]/40"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
                  <span>{it.tripTitle}</span>
                </LinkWithReturn>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  subtle = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md ${
        subtle
          ? "border-[var(--color-glass-border)] bg-[var(--color-bg-secondary)]/60"
          : "border-[var(--color-glass-border)] bg-[var(--color-glass-bg)]"
      } px-3.5 py-3`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[var(--color-accent-start)]" />
        <p className="font-courier text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          {label}
        </p>
      </div>
      <p
        className={`mt-1.5 font-courier font-bold leading-tight ${
          subtle ? "text-lg text-[var(--color-text-primary)]" : "text-2xl text-[var(--color-accent-start)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
