"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bookmark, MapPin, Clock, Sparkles, ChevronDown } from "lucide-react";
import { starItineraryById } from "@/content/inspiration/star-itineraries";
import type { StarItinerariesEditorialFile, StarItineraryEditorialItem } from "@/types/star-itineraries-editorial";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";

type Props = { slug: string };

export default function StarItineraryScreen({ slug }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const regionId = sp.get("region") ?? "";

  const legacy = starItineraryById(slug);
  const [editorial, setEditorial] = useState<StarItineraryEditorialItem | null>(null);
  const [mapExpanded, setMapExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [coverSrc, setCoverSrc] = useState(legacy?.coverPhoto ?? "");

  useEffect(() => {
    setCoverSrc(legacy?.coverPhoto ?? "");
  }, [slug, legacy?.coverPhoto]);

  useEffect(() => {
    if (legacy) return;
    if (!regionId) return;
    fetch(`/api/inspiration/region-editorial?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => (r.ok ? r.json() : { itineraries: [] }))
      .then((d: StarItinerariesEditorialFile) => {
        const match = d.itineraries?.find((it) => it.itinerarySlug === slug);
        if (match) setEditorial(match);
      })
      .catch(() => {});
  }, [slug, regionId, legacy]);

  const item = legacy || editorial;

  if (!item) {
    return (
      <main className="flex h-full items-center justify-center bg-[var(--cream)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  const title = legacy ? legacy.name : (editorial?.tripTitle ?? slug);
  const description = legacy
    ? legacy.shortDescription
    : (editorial?.summary ?? "");
  const duration = legacy?.durationHint ?? editorial?.durationHint ?? "";
  const steps = editorial?.steps ?? [];

  return (
    <main className="flex h-full flex-col bg-[var(--cream)]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#E07856]/15 bg-[var(--cream)] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-courier text-xs font-bold text-[#E07856]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-[#E07856]/25 px-3 py-1.5 font-courier text-[10px] font-bold text-[#E07856] transition hover:border-[#E07856]/40"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Garder
        </button>
      </div>

      {/* Map zone (collapsible) */}
      <div
        className={`shrink-0 overflow-hidden transition-all duration-500 ${
          mapExpanded ? "h-[45vh] min-h-[200px]" : "h-0"
        }`}
      >
        {coverSrc ? (
          <div className="relative h-full w-full">
            <Image
              src={coverSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <PhotoCurationOverlay
              slug={`star-cover:${slug}`}
              imageUrl={coverSrc}
              title={title}
              onOther={() => {
                fetch(
                  `/api/photo-ville?stepId=${encodeURIComponent(`star-cover-${slug}`)}&ville=${encodeURIComponent(title)}&slug=${encodeURIComponent(slug)}&refresh=1`
                )
                  .then((r) => (r.ok ? r.json() : null))
                  .then((d: { url?: string }) => {
                    if (d?.url) setCoverSrc(d.url);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#141414] to-[#E07856]/20">
            <MapPin className="h-12 w-12 text-[#E07856]/30" />
          </div>
        )}
      </div>

      {/* Toggle map */}
      <button
        onClick={() => setMapExpanded((v) => !v)}
        className="flex shrink-0 items-center justify-center gap-1 border-b border-[#E07856]/10 bg-[var(--cream)] py-2 font-courier text-[10px] font-bold uppercase tracking-wider text-[#E07856]/60"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${mapExpanded ? "" : "rotate-180"}`}
        />
        {mapExpanded ? "Masquer la carte" : "Voir la carte"}
      </button>

      {/* Content */}
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <p className="font-courier text-[10px] font-bold uppercase tracking-[0.4em] text-[#E07856]">
          Itinéraire star
        </p>
        <h1 className="mt-2 font-courier text-2xl font-bold leading-tight text-white/80">
          {title}
        </h1>
        {duration && (
          <span className="mt-2 inline-flex items-center gap-1 font-courier text-xs text-white/50">
            <Clock className="h-3.5 w-3.5" />
            {duration}
          </span>
        )}

        <p className="mt-5 font-courier text-sm leading-relaxed text-white/80">
          {description}
        </p>

        {editorial?.overnightStyle && (
          <p className="mt-3 rounded-xl bg-[#FFF8F2] px-4 py-3 font-courier text-xs italic leading-relaxed text-[#2a211c]/65">
            {editorial.overnightStyle}
          </p>
        )}

        {/* Etapes */}
        {steps.length > 0 && (
          <section className="mt-8">
            <h2 className="font-courier text-sm font-bold uppercase tracking-wider text-[#E07856]">
              Étapes
            </h2>
            <div className="mt-4 space-y-3">
              {steps.map((step, i) => (
                <Link
                  key={`${step.slug}-${i}`}
                  href={`/inspirer/ville/${step.slug}?from=itineraire`}
                  className="flex items-center gap-3 rounded-xl border border-[#E07856]/20 bg-white p-3.5 transition hover:border-[#E07856]/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E07856]/15 font-courier text-xs font-bold text-[#E07856]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-courier text-sm font-bold text-[#2a211c]">
                      {step.nom}
                    </p>
                    <p className="font-courier text-[10px] uppercase tracking-wider text-[#2a211c]/40">
                      {step.role === "etape" ? "Étape" : step.role}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Suggestions */}
        {editorial?.suggestedPoiAdditions && editorial.suggestedPoiAdditions.length > 0 && (
          <section className="mt-8 rounded-2xl border border-[#E07856]/15 bg-[#FFF8F2] p-5">
            <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
              Lieux suggérés en bonus
            </h2>
            <div className="mt-3 space-y-2">
              {editorial.suggestedPoiAdditions.map((poi, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E07856]/60" />
                  <div>
                    <p className="font-courier text-xs font-bold text-[#2a211c]">{poi.nom}</p>
                    <p className="font-courier text-[11px] text-[#2a211c]/50">{poi.raison}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-10 space-y-3 pb-4">
          <Link
            href={`/preparer?fromStar=${slug}&region=${regionId}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-4 font-courier text-sm font-bold text-white shadow-[0_10px_36px_rgba(224,120,86,0.45)] transition hover:brightness-105"
          >
            <Sparkles className="h-4 w-4" />
            Créer mon voyage à partir de cet itinéraire
          </Link>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#E07856]/30 py-3 font-courier text-sm font-bold text-[#E07856] transition hover:border-[#E07856]/50"
          >
            <Bookmark className="h-4 w-4" />
            Garder dans mes repères
          </button>
        </div>
      </div>
    </main>
  );
}
