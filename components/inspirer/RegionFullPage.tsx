"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReturnHref } from "@/lib/hooks/use-return-href";
import { ArrowLeft, Landmark, Mountain, Sparkles, Trees, Waves } from "lucide-react";
import { getRegionEditorial } from "@/content/inspiration/regions";
import { listTerritories } from "@/lib/editorial-territories";
import { slugFromNom } from "@/lib/slug-from-nom";
import { useRegionCardResolvedPhoto } from "@/hooks/useRegionCardResolvedPhoto";
import { CityPhoto } from "@/components/CityPhoto";

type SlimLieu = { slug: string; nom: string };

/** Aligne le slug photo sur `lieux` (clé maintenance) plutôt que seulement `slugFromNom` du libellé éditorial. */
function stepIdForIncontournable(label: string, lieux: SlimLieu[]): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const want = norm(label);
  for (const l of lieux) {
    if (norm(l.nom) === want) return l.slug;
  }
  const fromLabel = slugFromNom(label);
  for (const l of lieux) {
    if (l.slug === fromLabel) return l.slug;
  }
  return fromLabel;
}

type Props = {
  regionId: string;
  /** En mode sheet : pas de <main>, pas de bouton retour, layout plus compact. */
  embeddedInSheet?: boolean;
};

/**
 * Contenu de la page région. Réutilisé :
 * - en route /inspirer/region/[id] (embeddedInSheet=false → <main>)
 * - dans la sheet tirable de l'onglet carte (embeddedInSheet=true)
 *
 * La photo du hero vient du MÊME hook que le carousel (useRegionCardResolvedPhoto),
 * donc une fois résolue, c'est exactement la même image.
 */
export default function RegionFullPage({ regionId, embeddedInSheet = false }: Props) {
  const backHref = useReturnHref("/inspirer?tab=carte");
  const editorial = getRegionEditorial(regionId);

  const { src: headerUrl, resolveDone } = useRegionCardResolvedPhoto({
    id: regionId,
    headerPhoto: editorial?.headerPhoto ?? "",
  });

  const [lieux, setLieux] = useState<SlimLieu[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/inspiration/lieux-region?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => (r.ok ? r.json() : { lieux: [] }))
      .then((d) => {
        if (!cancelled) setLieux(d.lieux ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  if (!editorial) {
    const Wrapper = embeddedInSheet ? "div" : "main";
    return (
      <Wrapper className="flex h-full items-center justify-center bg-[var(--color-bg-main)]">
        <p className="font-courier text-sm text-[var(--color-text-secondary)]">
          Région introuvable.
        </p>
      </Wrapper>
    );
  }

  const incontournables = editorial.trois_incontournables;
  const incontournablesSlugs = new Set(
    incontournables.map((n) => stepIdForIncontournable(n, lieux))
  );
  const autresLieux = lieux.filter((l) => !incontournablesSlugs.has(l.slug));

  const heroReady = resolveDone && !!headerUrl;
  const ambienceCapsules = buildRegionAmbienceCapsules(regionId);
  const Wrapper = embeddedInSheet ? "div" : "main";

  return (
    <Wrapper
      className={
        embeddedInSheet
          ? "relative bg-[var(--color-bg-main)]"
          : "relative min-h-full bg-[var(--color-bg-main)]"
      }
    >
      {/* Hero : même image que la carte du carousel — aspect 3/4 rogné */}
      <div
        className={`relative overflow-hidden bg-[var(--color-bg-main)] ${
          embeddedInSheet
            ? "aspect-[2/1] max-h-[min(30vh,240px)] min-h-[150px]"
            : "aspect-[3/4] max-h-[55vh] min-h-[320px]"
        }`}
      >
        {heroReady ? (
          <Image
            src={headerUrl as string}
            alt={editorial.name}
            fill
            className="photo-bw-reveal object-cover"
            priority={!embeddedInSheet}
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-main)]">
            <Image
              src="/A5.png"
              alt=""
              width={80}
              height={80}
              className="opacity-40"
              style={{ filter: "var(--logo-filter-hero-center)" }}
            />
          </div>
        )}

        {/* Filigrane : nom de la région en gros sur le côté, semi-transparent */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-4 z-[1] hidden select-none whitespace-nowrap font-courier text-[20vw] font-bold uppercase leading-none tracking-tight text-white/6 drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)] sm:block"
        >
          {editorial.name}
        </span>

        {/* Scrim bas pour la lisibilité du titre */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg-main)] via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

        {!embeddedInSheet && (
          <Link
            href={backHref}
            className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-1 rounded-xl bg-black/50 px-3 py-1.5 font-courier text-xs font-bold text-white/85 backdrop-blur-sm transition hover:bg-black/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </Link>
        )}

        {/* Titre posé en bas du hero */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-accent-start)]">
            Région
          </p>
          <h1 className="mt-1 font-courier text-[2rem] font-bold leading-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
            {editorial.name}
          </h1>
          {embeddedInSheet && editorial.accroche_carte && (
            <p className="mt-1.5 line-clamp-2 font-courier text-xs leading-snug text-white/75">
              {editorial.accroche_carte}
            </p>
          )}
        </div>
      </div>

      {/* Corps : incontournables + autres villes */}
      <div
        className={`flex flex-col gap-10 px-5 pt-8 ${
          embeddedInSheet ? "pb-10" : "pb-bottom-nav"
        }`}
      >
        <section className="space-y-4">
          {!embeddedInSheet && (
            <p className="font-courier text-sm leading-relaxed text-[var(--color-text-primary)]/72">
              {editorial.accroche_carte}
            </p>
          )}
          <div className="rounded-2xl border border-[var(--color-glass-border)] bg-white/5 px-4 py-4">
            <p className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
              Avant les photos
            </p>
            <p className="mt-3 font-courier text-sm leading-relaxed text-[var(--color-text-primary)]/78">
              {editorial.intro_longue}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-glass-border)] bg-white/5 px-4 py-4">
            <p className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
              Ambiance
            </p>
            <p className="mt-3 font-courier text-sm leading-relaxed text-[var(--color-text-primary)]/72">
              {editorial.ambiance_detail}
            </p>
            {ambienceCapsules.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {ambienceCapsules.map((capsule) => (
                  <span
                    key={capsule.label}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-start)]/22 bg-[var(--color-accent-start)]/8 px-3 py-1.5 font-courier text-[11px] text-[var(--color-text-primary)]/82"
                  >
                    <capsule.icon className="h-3.5 w-3.5 text-[var(--color-accent-start)]" />
                    {capsule.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
            Incontournables
          </h2>
          {/* Incontournables : 3 vignettes verticales (3/4) côte à côte en grille responsive. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {incontournables.map((item, i) => {
              const slug = stepIdForIncontournable(item, lieux);
              return (
                <CityPictureCard
                  key={`${slug}-${i}`}
                  slug={slug}
                  nom={item}
                  regionId={regionId}
                  emphasis
                />
              );
            })}
          </div>
        </section>

        {autresLieux.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent-start)]">
                Autres villes
              </h2>
              <span className="font-courier text-[10px] text-[var(--color-text-secondary)]">
                {autresLieux.length} découvertes
              </span>
            </div>
            {/* Carousel horizontal, photos verticales 3/4, scroll-snap. */}
            <div className="-mx-5 overflow-x-auto overflow-y-hidden scrollbar-none">
              <div className="flex snap-x snap-mandatory gap-3 px-5 pb-2">
                {autresLieux.map((l, i) => (
                  <div
                    key={l.slug}
                    className="snap-start shrink-0 basis-[60%] sm:basis-[38%] md:basis-[28%]"
                  >
                    <CityPictureCard
                      slug={l.slug}
                      nom={l.nom}
                      regionId={regionId}
                      variantIndex={i}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="pt-2">
          <Link
            href={`/preparer?region=${regionId}`}
            className="btn-orange-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-courier text-sm font-bold text-white"
          >
            <Sparkles className="h-4 w-4" />
            Créer un voyage ici
          </Link>
        </div>
      </div>
    </Wrapper>
  );
}

function buildRegionAmbienceCapsules(regionId: string) {
  const territories = listTerritories().filter((territory) => territory.poi_sector_id === regionId);
  const tags = new Set<string>();
  for (const territory of territories) {
    for (const tag of [...territory.tags, ...territory.filter_tags]) {
      tags.add(tag);
    }
  }

  const ordered = [
    { key: "mer", label: "Ambiance mer", icon: Waves },
    { key: "nature", label: "Nature & grand air", icon: Trees },
    { key: "patrimoine", label: "Patrimoine", icon: Landmark },
    { key: "villages", label: "Villages", icon: Mountain },
    { key: "road_trip", label: "Road trip", icon: Sparkles },
  ];

  return ordered.filter((item) => tags.has(item.key)).slice(0, 5);
}

function CityPictureCard({
  slug,
  nom,
  regionId,
  emphasis = false,
  compact = false,
  variantIndex = 0,
}: {
  slug: string;
  nom: string;
  regionId: string;
  emphasis?: boolean;
  /** Mode carrousel : pas de curation, card plus légère, min-height réduit. */
  compact?: boolean;
  variantIndex?: number;
}) {
  return (
    <Link
      href={`/inspirer/ville/${slug}?from=region&region=${regionId}`}
      className="group relative block w-full overflow-hidden rounded-2xl border border-[var(--color-glass-border)]"
    >
      {/* Format vertical 3/4 — plus immersif que 16/10. */}
      <div
        className={`relative aspect-[3/4] bg-[var(--color-bg-secondary)] ${
          compact ? "min-h-[200px]" : "min-h-[260px]"
        }`}
      >
        <CityPhoto
          stepId={slug}
          ville={nom}
          alt={nom}
          className="absolute inset-0 h-full w-full object-cover"
          photoCuration={!compact}
          curationCompact
          curationTitle={nom}
          variantIndex={variantIndex}
        />
        <div className="pointer-events-none absolute inset-0 z-[45] bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[46] px-3 pb-3">
          <span
            className={`block text-left font-courier font-bold leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] ${
              emphasis ? "text-base sm:text-lg" : compact ? "text-sm" : "text-lg sm:text-xl"
            }`}
          >
            {nom}
          </span>
        </div>
      </div>
    </Link>
  );
}
