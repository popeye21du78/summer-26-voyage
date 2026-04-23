"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Map as MapIcon, Sparkles } from "lucide-react";
import {
  AMBIANCE_OPTIONS,
  type EditorialTerritory,
  type InspirationAmbianceFilter,
} from "@/lib/editorial-territories";
import { listFavorites, removeFavorite, type PlanifierFavorite } from "@/lib/planifier-favorites";
import { slugFromNom } from "@/lib/slug-from-nom";
import { CityPhoto } from "@/components/CityPhoto";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";
import {
  HOME_SECTION_H2,
  INSPI_CTA_GRADIENT,
  INSPI_SURFACE_CARD,
  INSPI_TEXT_MUTED,
  INSPI_TEXT_PRIMARY,
} from "../inspirationEditorialUi";
import type { RegionEditorialContent } from "@/types/inspiration";
import { themeCardImageByOffset } from "@/lib/star-itinerary-theme-card-images";
import type {
  StarItinerariesEditorialFile,
  StarItineraryEditorialItem,
} from "@/types/star-itineraries-editorial";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import { withReturnTo } from "@/lib/return-to";
import PlaceAffinityActions from "../PlaceAffinityActions";

function StarThemePreviewCard({
  it,
  onOpenStars,
  cardClass,
}: {
  it: StarItineraryEditorialItem;
  onOpenStars: () => void;
  cardClass: string;
}) {
  const [offset, setOffset] = useState(0);
  const src = themeCardImageByOffset(it.themeTitle, offset);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpenStars}
      className={`overflow-hidden rounded-2xl text-left ${cardClass}`}
    >
      <div className="relative h-[100px] w-full bg-[#3d3430]">
        <Image src={src} alt="" fill className="object-cover" sizes="200px" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/30" />
        <PhotoCurationOverlay
          slug={`explore-star-theme:${it.itinerarySlug}`}
          imageUrl={src}
          title={it.themeTitle}
          compact
          onOther={() => setOffset((o) => o + 1)}
        />
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-2 text-center font-courier text-[11px] font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
          {it.themeTitle}
        </span>
      </div>
      <div className="px-3 py-2">
        <p className={`font-courier text-[10px] uppercase tracking-wide ${INSPI_TEXT_MUTED}`}>
          {it.durationHint}
        </p>
        <p className="mt-1 line-clamp-2 font-courier text-[11px] text-[#fde8e0]/95">
          {it.tripTitle || it.summary}
        </p>
      </div>
    </motion.button>
  );
}

type SlimLieuCard = {
  slug: string;
  nom: string;
  source_type: string;
  description_courte?: string;
};

type TabKey = "lieux" | "itineraires" | "reperes";

async function fetchRegionEditorialPack(regionId: string): Promise<StarItinerariesEditorialFile> {
  const r = await fetch(
    `/api/inspiration/region-editorial?regionId=${encodeURIComponent(regionId)}`,
    { cache: "no-store" }
  );
  if (!r.ok) return { itineraries: [] };
  return (await r.json()) as StarItinerariesEditorialFile;
}

function favoritesForRegionView(
  regionId: string,
  territoryIds: string[],
  _refreshToken?: number
): PlanifierFavorite[] {
  const tset = new Set(territoryIds);
  return listFavorites().filter((f) => {
    if (f.kind === "map_region") return f.refId === regionId;
    if (f.kind === "territory") return tset.has(f.refId);
    if (
      f.kind === "place" ||
      f.kind === "known_place" ||
      f.kind === "star_itinerary" ||
      f.kind === "route_idea"
    )
      return true;
    return false;
  });
}

export default function ExploreRegionContent({
  regionId,
  r,
  filtered,
  lieuxCards,
  ambiance,
  setAmbiance,
  essentialsOnly,
  onBack,
  onOpenStars,
  onOpenMap,
  onPickTerritory,
  onExpandFull,
}: {
  regionId: string;
  r: RegionEditorialContent;
  filtered: EditorialTerritory[];
  lieuxCards: SlimLieuCard[];
  ambiance: InspirationAmbianceFilter[];
  setAmbiance: Dispatch<SetStateAction<InspirationAmbianceFilter[]>>;
  essentialsOnly: boolean;
  onBack: () => void;
  onOpenStars: () => void;
  onOpenMap: () => void;
  onPickTerritory: (id: string) => void;
  onExpandFull: () => void;
}) {
  const returnBase = useReturnBase();
  const [tab, setTab] = useState<TabKey>("lieux");
  const [editorialPack, setEditorialPack] = useState<StarItinerariesEditorialFile | null>(null);
  const [favTick, setFavTick] = useState(0);

  const mustSlugs = useMemo(
    () => new Set(r.trois_incontournables.map((n) => slugFromNom(n))),
    [r.trois_incontournables]
  );

  const territoryIds = useMemo(() => filtered.map((t) => t.id), [filtered]);

  const repères = favoritesForRegionView(regionId, territoryIds, favTick);

  useEffect(() => {
    let c = false;
    fetchRegionEditorialPack(regionId).then((d) => {
      if (!c) setEditorialPack(d);
    });
    return () => {
      c = true;
    };
  }, [regionId]);

  const editorialPreview = useMemo(() => {
    const it = editorialPack?.itineraries ?? [];
    const seen = new Set<string>();
    const out: typeof it = [];
    for (const x of it) {
      const k = `${x.themeTitle}|${x.durationHint}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
      if (out.length >= 4) break;
    }
    return out;
  }, [editorialPack]);

  const lieuxRestants = useMemo(() => {
    return lieuxCards.filter((l) => !mustSlugs.has(l.slug)).slice(0, 16);
  }, [lieuxCards, mustSlugs]);

  const toggleAmbiance = (id: InspirationAmbianceFilter) => {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const refreshFavs = () => setFavTick((x) => x + 1);

  const editorialPhotos = useMemo(
    () => (r.photos ?? []).filter((u) => typeof u === "string" && u.trim().length > 0),
    [r.photos]
  );

  if (essentialsOnly) {
    return (
      <div className={`${INSPI_TEXT_PRIMARY}`}>
        <div className="border-b border-[#ffd4c4]/20 bg-gradient-to-r from-[#6d4538]/95 via-[#8a5344]/90 to-[#5c382e]/95 px-4 py-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className={`${HOME_SECTION_H2} text-[#FFFBF7]`}>{r.name}</h2>
              <p className={`mt-1 line-clamp-3 font-courier text-[12px] leading-snug ${INSPI_TEXT_MUTED}`}>
                {r.accroche_carte}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenMap}
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-white/10`}
            >
              <MapIcon className="h-4 w-4" aria-hidden />
              Carte plein écran
            </button>
            <button
              type="button"
              onClick={onOpenStars}
              className={`inline-flex items-center gap-1.5 rounded-full border border-[#f5c4b8]/35 px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide text-[#fde8e0] transition hover:bg-white/10`}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Itinéraires stars
            </button>
          </div>
        </div>

        <div className="space-y-8 px-4 pb-10 pt-5">
          <section>
            <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.15rem] text-[#FFFBF7]`}>
              Incontournables
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {r.trois_incontournables.map((nom) => {
                const slug = slugFromNom(nom);
                return (
                  <motion.div key={nom} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={withReturnTo(`/inspirer/ville/${slug}?from=inspiration`, returnBase)}
                      className={`group block overflow-hidden rounded-2xl ${INSPI_SURFACE_CARD} ring-1 ring-[#f5c4b8]/25`}
                    >
                      <div className="relative aspect-[16/11] w-full bg-[#3d3430]">
                        <CityPhoto
                          stepId={slug}
                          ville={nom}
                          alt={nom}
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                          photoCuration
                          curationTitle={nom}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/35" />
                        <span className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center px-2 text-center font-courier text-[11px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                          {nom}
                        </span>
                      </div>
                      <div className="px-2 py-2">
                        <span className={`font-courier text-[10px] ${INSPI_TEXT_MUTED}`}>Repère fort</span>
                      </div>
                    </Link>
                    <div className="mt-2">
                      <PlaceAffinityActions placeSlug={slug} placeLabel={nom} compact />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {editorialPhotos.length > 0 && (
            <section>
              <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.05rem] text-[#FFFBF7]`}>
                En images
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
                {editorialPhotos.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative h-[112px] w-[168px] shrink-0 overflow-hidden rounded-xl bg-[#3d3430] ring-1 ring-white/10"
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="168px" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={onExpandFull}
            className={`w-full rounded-2xl border border-white/15 py-3 font-courier text-[12px] font-bold uppercase tracking-wide text-[#fde8e0] transition hover:bg-white/10 ${INSPI_SURFACE_CARD}`}
          >
            Explorer davantage — filtres, lieux sur la carte, onglets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${INSPI_TEXT_PRIMARY}`}>
      {/* ZONE 1 — header léger */}
      <div className="sticky top-0 z-[2] border-b border-[#ffd4c4]/20 bg-gradient-to-r from-[#6d4538]/95 via-[#8a5344]/90 to-[#5c382e]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Retour"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className={`${HOME_SECTION_H2} text-[#FFFBF7]`}>{r.name}</h2>
            <p className={`mt-1 line-clamp-2 font-courier text-[12px] leading-snug ${INSPI_TEXT_MUTED}`}>
              {r.accroche_carte}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/planifier/favoris"
            className={`inline-flex items-center gap-1.5 rounded-full border border-[#f5c4b8]/35 px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide text-[#fde8e0] transition hover:bg-white/10`}
          >
            Mes envies
          </Link>
          <button
            type="button"
            onClick={onOpenMap}
            className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-white/10`}
          >
            <MapIcon className="h-4 w-4" aria-hidden />
            Carte plein écran
          </button>
        </div>
      </div>

      {/* ZONE 2 — filtres chips */}
      <div className="px-4 pb-2 pt-3">
        <p className={`font-courier text-[10px] font-bold uppercase tracking-[0.2em] ${INSPI_TEXT_MUTED}`}>
          Filtrer
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {AMBIANCE_OPTIONS.map((opt) => {
            const on = ambiance.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleAmbiance(opt.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide transition active:scale-[0.97] ${
                  on
                    ? "border-[#f5c4b8]/50 bg-[#8b5e4f]/80 text-[#fff8f4] shadow-inner"
                    : "border-white/15 bg-white/5 text-[#e8d4cb] hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ZONE 4 — modes (carte = zone 3, derrière la sheet) */}
      <div className="border-b border-[#f5e6dc]/10 px-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["lieux", "Lieux"],
              ["itineraires", "Itinéraires"],
              ["reperes", "Mes repères"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-xl py-2.5 text-center font-courier text-[11px] font-bold uppercase tracking-wide transition active:scale-[0.98] ${
                tab === key
                  ? "bg-[#8b5e4f]/90 text-white shadow-md ring-1 ring-[#f5c4b8]/30"
                  : "bg-white/5 text-[#e8d4cb] hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 px-4 pb-8 pt-4">
        {tab === "lieux" && (
          <>
            <section>
              <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.15rem] text-[#FFFBF7]`}>
                Incontournables
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {r.trois_incontournables.map((nom) => {
                  const slug = slugFromNom(nom);
                  return (
                    <motion.div key={nom} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={withReturnTo(`/inspirer/ville/${slug}?from=inspiration`, returnBase)}
                        className={`group block overflow-hidden rounded-2xl ${INSPI_SURFACE_CARD} ring-1 ring-[#f5c4b8]/25`}
                      >
                        <div className="relative aspect-[16/11] w-full bg-[#3d3430]">
                          <CityPhoto
                            stepId={slug}
                            ville={nom}
                            alt={nom}
                            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                            photoCuration
                            curationTitle={nom}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/35" />
                          <span className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center px-2 text-center font-courier text-[11px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                            {nom}
                          </span>
                        </div>
                        <div className="px-2 py-2">
                          <span className={`font-courier text-[10px] ${INSPI_TEXT_MUTED}`}>Repère fort</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {editorialPhotos.length > 0 && (
              <section>
                <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.15rem] text-[#FFFBF7]`}>
                  En images
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
                  {editorialPhotos.map((src, i) => (
                    <div
                      key={`${src}-full-${i}`}
                      className="relative h-[112px] w-[168px] shrink-0 overflow-hidden rounded-xl bg-[#3d3430] ring-1 ring-white/10"
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="168px" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.15rem] text-[#FFFBF7]`}>
                Sur la carte
              </h3>
              <p className={`mb-3 font-courier text-[12px] ${INSPI_TEXT_MUTED}`}>
                Touche un point : taille et couleur indiquent repères forts, sauvegardés ou pistes.
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                {filtered.map((t) => (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onPickTerritory(t.id)}
                    className={`flex max-w-[220px] shrink-0 flex-col rounded-2xl px-3.5 py-3 text-left ${INSPI_SURFACE_CARD}`}
                  >
                    <span className="font-courier text-[13px] font-bold text-[#FFFBF7]">{t.name}</span>
                    <span className={`mt-1 line-clamp-2 font-courier text-[10px] leading-relaxed ${INSPI_TEXT_MUTED}`}>
                      {t.pitch}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>

            {lieuxRestants.length > 0 && (
              <section>
                <h3 className={`mb-3 ${HOME_SECTION_H2} text-[1.05rem] text-[#FFFBF7]`}>
                  Autres pistes
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {lieuxRestants.map((l) => (
                    <motion.div key={l.slug} whileTap={{ scale: 0.98 }} className="w-[158px] shrink-0">
                      <Link
                        href={withReturnTo(`/inspirer/ville/${l.slug}?from=inspiration`, returnBase)}
                        className={`group block overflow-hidden rounded-xl ${INSPI_SURFACE_CARD}`}
                      >
                        <div className="relative h-[104px] w-full bg-[#3d3430]">
                          <CityPhoto
                            stepId={l.slug}
                            ville={l.nom}
                            alt={l.nom}
                            className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.04]"
                            photoCuration
                            curationCompact
                            curationTitle={l.nom}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/35" />
                          <span className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center px-2 text-center line-clamp-3 font-courier text-[10px] font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                            {l.nom}
                          </span>
                        </div>
                      </Link>
                      <div className="mt-2">
                        <PlaceAffinityActions
                          placeSlug={l.slug}
                          placeLabel={l.nom}
                          compact
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "itineraires" && (
          <section className="space-y-4">
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={onOpenStars}
              className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left text-white ${INSPI_CTA_GRADIENT}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Sparkles className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-courier text-base font-bold uppercase tracking-wide">
                  Itinéraires stars
                </span>
                <span className="mt-1 block font-courier text-[12px] text-white/88">
                  Choisir un angle, une durée, voir le tracé.
                </span>
              </span>
            </motion.button>

            {editorialPreview.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {editorialPreview.map((it) => (
                  <StarThemePreviewCard
                    key={it.itinerarySlug}
                    it={it}
                    onOpenStars={onOpenStars}
                    cardClass={INSPI_SURFACE_CARD}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "reperes" && (
          <section className="space-y-3">
            {repères.length === 0 ? (
              <p className={`font-courier text-sm ${INSPI_TEXT_MUTED}`}>
                Rien pour l’instant — ajoute des cœurs depuis la carte ou les fiches.
              </p>
            ) : (
              repères.map((f) => (
                <motion.div
                  key={f.id}
                  layout
                  className={`flex items-center gap-3 rounded-2xl p-3 ${INSPI_SURFACE_CARD}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-courier text-[9px] uppercase tracking-wide text-[#f5c4b8]/80">
                      {f.kind.replace("_", " ")}
                    </p>
                    <p className="font-courier text-sm font-bold text-[#FFFBF7]">{f.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeFavorite(f.id);
                      refreshFavs();
                    }}
                    className="shrink-0 rounded-full border border-white/15 px-2 py-1 font-courier text-[10px] text-[#f5c4b8] hover:bg-white/10"
                  >
                    Retirer
                  </button>
                </motion.div>
              ))
            )}
            <Link
              href="/planifier/favoris"
              className={`inline-block font-courier text-xs font-bold underline decoration-[#f5c4b8]/40 ${INSPI_TEXT_MUTED}`}
            >
              Tout voir dans Mes envies
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
