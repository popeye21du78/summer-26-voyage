"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReturnHref } from "@/lib/hooks/use-return-href";
import { ArrowLeft, Map as MapIcon, Star, Sparkles, ChevronRight } from "lucide-react";
import { getRegionEditorial } from "@/content/inspiration/regions";
import { starItinerariesByRegion } from "@/content/inspiration/star-itineraries";
import { slugFromNom } from "@/lib/slug-from-nom";
import {
  cacheKeysRegionHeader,
  cachePhotoUrl,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import { getUserValidatedPhotoUrl } from "@/lib/client-photo-validated";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import { CityPhoto } from "@/components/CityPhoto";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";
import type { StarItinerariesEditorialFile, StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";

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

type Props = { regionId: string };

export default function RegionFullPage({ regionId }: Props) {
  const backHref = useReturnHref("/inspirer?tab=carte");
  const editorial = getRegionEditorial(regionId);
  const legacyStars = starItinerariesByRegion(regionId);
  const regionHeaderSlug = `region-header:${regionId}`;

  const [lieux, setLieux] = useState<SlimLieu[]>([]);
  const [editorialStars, setEditorialStars] = useState<StarItineraryEditorialItem[]>([]);
  const [headerUrl, setHeaderUrl] = useState("");
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (!editorial) return;
    const cached =
      getCachedPhotoUrl(cacheKeysRegionHeader(regionId)) ??
      getUserValidatedPhotoUrl(regionHeaderSlug);
    if (cached) {
      setHeaderUrl(cached);
      setHeroReady(true);
      return;
    }
    setHeaderUrl("");
    setHeroReady(false);
    let cancelled = false;

    (async () => {
      await loadPhotoValidationSnapshot();
      if (cancelled) return;
      try {
        const r = await fetch(
          `/api/photo-resolve?slug=${encodeURIComponent(regionHeaderSlug)}&stepId=${encodeURIComponent(regionId)}&photoIndex=0`
        );
        const d = r.ok ? ((await r.json()) as { url?: string | null }) : null;
        if (cancelled) return;
        const u = d?.url?.trim();
        setHeaderUrl(u || editorial.headerPhoto);
        setHeroReady(true);
      } catch {
        if (!cancelled) {
          setHeaderUrl(editorial.headerPhoto);
          setHeroReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editorial, regionId, regionHeaderSlug]);

  useEffect(() => {
    if (heroReady && headerUrl.trim()) {
      cachePhotoUrl(cacheKeysRegionHeader(regionId), headerUrl);
    }
  }, [regionId, heroReady, headerUrl]);

  useEffect(() => {
    fetch(`/api/inspiration/lieux-region?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => (r.ok ? r.json() : { lieux: [] }))
      .then((d) => setLieux(d.lieux?.slice(0, 12) ?? []))
      .catch(() => {});

    fetch(`/api/inspiration/region-editorial?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => (r.ok ? r.json() : { itineraries: [] }))
      .then((d: StarItinerariesEditorialFile) => setEditorialStars(d.itineraries?.slice(0, 6) ?? []))
      .catch(() => {});
  }, [regionId]);

  if (!editorial) {
    return (
      <main className="flex h-full items-center justify-center bg-[#111111]">
        <p className="font-courier text-sm text-white/30">Région introuvable.</p>
      </main>
    );
  }

  return (
    <main className="min-h-full overflow-y-auto bg-[#111111]">
      {/* Hero - vertical aspect */}
      <div className="relative aspect-[3/4] max-h-[55vh] min-h-[300px] overflow-hidden bg-[#111111]">
        {heroReady && headerUrl ? (
          <Image
            src={headerUrl}
            alt={editorial.name}
            fill
            className="photo-bw-reveal object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111111]">
            <Image
              src="/A1.png"
              alt=""
              width={64}
              height={64}
              className="opacity-25"
              style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }}
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111111] via-black/30 to-transparent" />
        {heroReady && headerUrl ? (
          <PhotoCurationOverlay
            slug={regionHeaderSlug}
            imageUrl={headerUrl}
            title={editorial.name}
            compact
            photoLookupStepId={regionId}
            sessionPhotoCacheKey={cacheKeysRegionHeader(regionId)}
            onOther={() => {
              fetch(
                `/api/photo-ville?stepId=${encodeURIComponent(`region-header-${regionId}`)}&ville=${encodeURIComponent(editorial.name)}&slug=${encodeURIComponent(regionId)}&refresh=1`
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { url?: string }) => {
                  if (d?.url) {
                    setHeaderUrl(d.url);
                    cachePhotoUrl(cacheKeysRegionHeader(regionId), d.url);
                  }
                })
                .catch(() => {});
            }}
          />
        ) : null}

        <Link
          href={backHref}
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-1 rounded-xl bg-black/50 px-3 py-1.5 font-courier text-xs font-bold text-white/80 backdrop-blur-sm transition hover:bg-black/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>
        <Link
          href="/inspirer"
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-1 rounded-xl bg-black/50 px-3 py-1.5 font-courier text-xs font-bold text-white/80 backdrop-blur-sm transition hover:bg-black/70"
        >
          <MapIcon className="h-3.5 w-3.5" />
          Carte
        </Link>

        {/* Logo watermark */}
        <div className="absolute right-5 top-1/3 opacity-[0.04]">
          <Image src="/A1.png" alt="" width={100} height={100} className="brightness-0 invert" />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
          <p className="font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#E07856]">
            Région
          </p>
          <h1 className="mt-1 font-courier text-3xl font-bold leading-tight text-white">
            {editorial.name}
          </h1>
          <p className="mt-2 max-w-[90%] font-courier text-sm leading-relaxed text-white/65">
            {editorial.accroche_carte}
          </p>
        </div>
      </div>

      {/* Filigrane title */}
      <div className="relative px-5 py-8">
        <p className="absolute left-5 top-4 font-courier text-[3rem] font-bold uppercase leading-none tracking-widest text-white/[0.03]">
          {editorial.name}
        </p>
        <p className="relative z-10 font-courier text-sm leading-relaxed text-white/55">
          {editorial.intro_longue}
        </p>
      </div>

      {/* Trois incontournables — cartes photo + titre central (comme les stars) */}
      <section className="border-t border-white/5 px-5 py-8">
        <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
          3 incontournables
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {editorial.trois_incontournables.map((item, i) => {
            const slug = stepIdForIncontournable(item, lieux);
            return (
              <Link
                key={`${slug}-${i}`}
                href={`/inspirer/ville/${slug}?from=region&region=${regionId}`}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/6"
              >
                <div className="relative aspect-[16/10] min-h-[168px] bg-[#111111]">
                  <CityPhoto
                    stepId={slug}
                    ville={item}
                    alt={item}
                    className="absolute inset-0 h-full w-full object-cover"
                    photoCuration
                    curationCompact
                    curationTitle={item}
                  />
                  <div className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center bg-gradient-to-t from-black/55 via-black/10 to-black/35 px-4">
                    <span className="text-center font-courier text-xl font-bold leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-2xl">
                      {item}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lieux - vertical cards with photos */}
      {lieux.length > 0 && (
        <section className="border-t border-white/5 px-5 py-8">
          <h2 className="mb-4 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
            Lieux à découvrir
          </h2>
          <div className="flex flex-col gap-4">
            {lieux.map((l) => (
              <Link
                key={l.slug}
                href={`/inspirer/ville/${l.slug}?from=region&region=${regionId}`}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/6"
              >
                <div className="relative aspect-[16/10] min-h-[152px] bg-[#111111]">
                  <CityPhoto
                    stepId={l.slug}
                    ville={l.nom}
                    alt={l.nom}
                    className="absolute inset-0 h-full w-full object-cover"
                    photoCuration
                    curationCompact
                    curationTitle={l.nom}
                  />
                  <div className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center bg-gradient-to-t from-black/55 via-black/10 to-black/35 px-4">
                    <span className="text-center font-courier text-lg font-bold leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-xl">
                      {l.nom}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Itinéraires stars */}
      {(editorialStars.length > 0 || legacyStars.length > 0) && (
        <section className="border-t border-white/5 px-5 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
              <Star className="mr-1 inline h-3.5 w-3.5" />
              Itinéraires stars
            </h2>
            <Link
              href={`/inspirer?tab=stars&region=${regionId}`}
              className="flex items-center gap-1 font-courier text-[10px] font-bold text-[#E07856]/60 transition hover:text-[#E07856]"
            >
              Voir tous
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {editorialStars.slice(0, 4).map((it) => (
              <Link
                key={it.itinerarySlug}
                href={`/inspirer?tab=stars&region=${regionId}`}
                className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-4 transition hover:border-[#E07856]/20 hover:bg-white/5"
              >
                <Sparkles className="h-5 w-5 shrink-0 text-[#E07856]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-courier text-sm font-bold text-white/75">
                    {it.tripTitle}
                  </p>
                  <p className="mt-0.5 truncate font-courier text-[11px] text-white/30">
                    {it.themeTitle} · {it.durationHint}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/15" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ambiance */}
      <section className="border-t border-white/5 px-5 py-8">
        <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
          Ambiance
        </h2>
        <p className="mt-3 font-courier text-sm leading-relaxed text-white/45">
          {editorial.ambiance_detail}
        </p>
      </section>

      {/* Note terrain with page signature */}
      <section className="page-signature-pattern border-t border-white/5 px-5 py-8">
        <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
          Note de terrain
        </h2>
        <p className="mt-3 font-courier text-sm italic leading-relaxed text-white/40">
          {editorial.note_terrain}
        </p>
      </section>

      {/* CTA bottom */}
      <div className="sticky bottom-16 border-t border-white/6 bg-[#111111]/95 px-5 py-4 backdrop-blur-lg">
        <div className="flex gap-3">
          <Link
            href="/inspirer"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-courier text-xs font-bold text-white/50 transition hover:border-white/20 hover:text-white/70"
          >
            <MapIcon className="h-4 w-4" />
            Retour carte
          </Link>
          <Link
            href={`/preparer?region=${regionId}`}
            className="btn-orange-glow flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-courier text-xs font-bold text-white"
          >
            <Sparkles className="h-4 w-4" />
            Créer un voyage ici
          </Link>
        </div>
      </div>
    </main>
  );
}
