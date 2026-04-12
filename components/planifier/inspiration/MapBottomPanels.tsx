"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import {
  filterTerritoriesByInspiration,
  getTerritoryById,
  listTerritories,
  type EditorialTerritory,
  type InspirationAmbianceFilter,
  type InspirationDurationFilter,
} from "@/lib/editorial-territories";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import { getRegionEditorial } from "@/content/inspiration/regions";
import {
  starItinerariesByRegion,
  starItineraryById,
} from "@/content/inspiration/star-itineraries";
import { CityPhoto } from "@/components/CityPhoto";
import { slugFromNom } from "@/lib/slug-from-nom";
import FavoriteButton from "./FavoriteButton";

type SlimLieuCard = {
  slug: string;
  nom: string;
  source_type: string;
  description_courte?: string;
};

/** Même alternance que les pages Ville (VilleDescriptionClient) */
const BAND_DARK =
  "border border-white/15 bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D] shadow-md";
const BAND_LIGHT =
  "border border-[#E07856]/25 bg-gradient-to-br from-[#FFF8F0] to-[#FAF4F0] shadow-sm";

function SheetChrome({
  children,
  onBack,
  tall: _tall,
  onScroll,
  onDragClose,
  /** Carte/fiche : une seule poignée hors sheet (jointure) — pas de 2e barre ni texte d’aide. */
  variant = "default",
}: {
  children: React.ReactNode;
  onBack?: () => void;
  tall?: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
  variant?: "default" | "split";
}) {
  const isSplit = variant === "split";
  return (
    <motion.div
      initial={isSplit ? { opacity: 0.98, y: 10 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={isSplit ? { opacity: 0.96, y: 12 } : { opacity: 0, y: 28 }}
      transition={{
        duration: isSplit ? 0.7 : 0.45,
        ease: [0.25, 0.85, 0.35, 1],
      }}
      className={`relative flex h-full min-h-0 flex-col rounded-t-3xl border border-[#A55734]/15 shadow-[0_-6px_32px_rgba(80,40,20,0.1)] ${
        isSplit ? "bg-[#FAF4F0]" : "bg-[#FFFBF8]"
      }`}
    >
      {!isSplit && onDragClose ? (
        <motion.div
          className="flex min-h-[48px] shrink-0 cursor-grab touch-none select-none items-center justify-center px-6 py-2 active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.velocity.y > 520 && info.offset.y > 20) onDragClose();
          }}
        >
          <div className="h-1.5 w-16 rounded-full bg-[#A55734]/45 shadow-sm" />
        </motion.div>
      ) : !isSplit ? (
        <div className="flex shrink-0 justify-center pt-2">
          <div className="h-1.5 w-11 rounded-full bg-[#A55734]/30" />
        </div>
      ) : null}
      {!isSplit && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 font-courier text-xs font-bold text-[#A55734] shadow-sm hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
      )}
      {!isSplit && (
        <p className="mt-0.5 text-center font-courier text-[10px] text-[#333]/45">
          Tire la jointure entre carte et fiche pour les proportions · coup sec sur la poignée pour fermer
        </p>
      )}
      <div
        onScroll={onScroll}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 ${isSplit ? "pt-3" : "pt-6"}`}
      >
        {children}
      </div>
    </motion.div>
  );
}

type PanelsProps = {
  onSheetScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
};

export default function MapBottomPanels({ onSheetScroll }: PanelsProps) {
  const ctx = useInspirationMap();
  const { top, goBack, goExploreRegion, openStarList, selectStarItinerary, selectTerritoryPoi, resetFrance } =
    ctx;

  const allTerritories = listTerritories();

  if (top.screen === "france") return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <AnimatePresence mode="wait">
      {top.screen === "region-preview" && (
        <PreviewRegion
          key="preview"
          regionId={top.regionId}
          onExplore={goExploreRegion}
          onStars={openStarList}
          onScroll={onSheetScroll}
          onDragClose={resetFrance}
        />
      )}
      {top.screen === "region-explore" && (
        <ExploreRegion
          key="explore"
          regionId={top.regionId}
          ambiance={ctx.ambiance}
          duration={ctx.duration}
          territories={allTerritories}
          onBack={goBack}
          onOpenStars={openStarList}
          onPickTerritory={selectTerritoryPoi}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
      {top.screen === "poi-detail" && (
        <PoiSheet
          key="poi"
          territoryId={top.territoryId}
          onBack={goBack}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
      {top.screen === "star-list" && (
        <StarListSheet
          key="stars"
          regionId={top.regionId}
          onBack={goBack}
          onPick={(id) => selectStarItinerary(id)}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
      {top.screen === "star-detail" && (
        <StarDetailSheet
          key="stard"
          itineraryId={top.itineraryId}
          onBack={goBack}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
    </AnimatePresence>
    </div>
  );
}

function PreviewRegion({
  regionId,
  onExplore,
  onStars,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  onExplore: () => void;
  onStars: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const r = getRegionEditorial(regionId);
  if (!r) return null;

  const carouselIntro = r.photos.slice(0, 5);

  return (
    <SheetChrome
      tall
      onScroll={onScroll}
      onDragClose={onDragClose}
      variant="split"
    >
      <div className="-mx-4 mb-4 overflow-hidden rounded-2xl border border-[#A55734]/20 bg-[#2a1810] shadow-inner">
        <div className="relative aspect-[4/3] w-full max-h-[min(48vh,400px)] min-h-[180px]">
          <Image
            src={r.headerPhoto}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/20 to-black/35" />
          <h1 className="absolute left-0 right-0 top-0 px-4 pb-10 pt-4 font-courier text-2xl font-bold tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] sm:text-3xl">
            {r.name}
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        <div className={`rounded-xl px-4 py-4 ${BAND_LIGHT}`}>
          <p className="font-courier text-sm leading-relaxed text-[#333]/90">{r.accroche_carte}</p>
        </div>

        <div className={`rounded-xl px-4 py-4 ${BAND_DARK}`}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onExplore}
              className="flex-1 rounded-full border-2 border-white/25 bg-gradient-to-r from-[#E07856] to-[#D4635B] py-3.5 font-courier text-sm font-bold text-white shadow-md transition hover:opacity-95"
            >
              Explorer la région
            </button>
            <button
              type="button"
              onClick={onStars}
              className="flex-1 rounded-full border-2 border-white/35 bg-white/12 py-3.5 font-courier text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Itinéraires stars
            </button>
          </div>
        </div>

        <div className={`flex items-start justify-between gap-3 rounded-xl px-4 py-4 ${BAND_LIGHT}`}>
          <p className="flex-1 font-courier text-sm leading-relaxed text-[#333]/90">{r.paragraphe_explorer}</p>
          <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
        </div>

        <div className={`rounded-xl px-4 py-5 ${BAND_DARK}`}>
          <p className="font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
            Ambiances
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {carouselIntro.map((src, i) => (
              <div
                key={i}
                className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl bg-[#3d2818] shadow-sm ring-1 ring-white/15"
              >
                <Image src={src} alt="" fill className="object-cover opacity-95" sizes="160px" />
              </div>
            ))}
          </div>
        </div>

        <section className={`rounded-xl px-4 py-5 ${BAND_LIGHT}`}>
          <h3 className="font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-[#A55734]">
            L’esprit du territoire
          </h3>
          <p className="mt-3 font-courier text-sm leading-relaxed text-[#333]/88">{r.intro_longue}</p>
        </section>

        <section className={`rounded-xl px-4 py-5 ${BAND_DARK}`}>
          <h3 className="font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
            Comment la parcourir
          </h3>
          <p className="mt-3 font-courier text-sm leading-relaxed text-white/88">{r.ambiance_detail}</p>
        </section>

        <section className={`rounded-xl px-4 py-5 ${BAND_LIGHT}`}>
          <h3 className="font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-[#A55734]">
            Trois incontournables
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {r.trois_incontournables.map((nom) => {
              const slug = slugFromNom(nom);
              return (
                <Link
                  key={nom}
                  href={`/ville/${slug}?from=inspiration`}
                  className="group overflow-hidden rounded-2xl border border-[#A55734]/15 bg-white shadow-sm transition hover:border-[#E07856]/40"
                >
                  <div className="relative h-[100px] w-full overflow-hidden bg-[#e8dfd6]">
                    <CityPhoto
                      stepId={slug}
                      ville={nom}
                      alt={nom}
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 text-center font-courier text-[11px] font-bold leading-tight text-white drop-shadow">
                      {nom}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className={`rounded-xl px-4 py-4 ${BAND_DARK}`}>
          <p className="font-courier text-[10px] font-bold uppercase text-white/70">Note terrain</p>
          <p className="mt-1.5 font-courier text-xs leading-relaxed text-white/88">{r.note_terrain}</p>
        </aside>
      </div>
    </SheetChrome>
  );
}

function ExploreRegion({
  regionId,
  ambiance,
  duration,
  territories,
  onBack,
  onOpenStars,
  onPickTerritory,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  ambiance: InspirationAmbianceFilter[];
  duration: InspirationDurationFilter | null;
  territories: EditorialTerritory[];
  onBack: () => void;
  onOpenStars: () => void;
  onPickTerritory: (id: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const r = getRegionEditorial(regionId);
  const filtered = filterTerritoriesByInspiration(
    territories,
    ambiance,
    duration,
    regionId
  );

  const [lieuxCards, setLieuxCards] = useState<SlimLieuCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set("regionId", regionId);
    qs.set("variant", "gallery");
    qs.set("galleryLimit", "24");
    for (const a of ambiance) qs.append("ambiance", a);
    fetch(`/api/inspiration/lieux-region?${qs.toString()}`)
      .then((res) => res.json())
      .then((d: { lieux?: SlimLieuCard[] }) => {
        if (cancelled || !Array.isArray(d.lieux)) return;
        setLieuxCards(d.lieux);
      })
      .catch(() => {
        if (!cancelled) setLieuxCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId, ambiance]);

  return (
    <SheetChrome
      onBack={onBack}
      tall
      onScroll={onScroll}
      onDragClose={onDragClose}
    >
      {r && (
        <>
          <div className="mb-5 flex items-center gap-3 border-b border-[#A55734]/10 pb-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#e8dfd6]">
              <Image src={r.headerPhoto} alt="" fill className="object-cover" sizes="64px" />
            </div>
            <div className="min-w-0">
              <h2 className="font-courier text-lg font-bold text-[#A55734]">{r.name}</h2>
              <p className="mt-0.5 font-courier text-[13px] leading-snug text-[#333]/80">{r.accroche_carte}</p>
            </div>
          </div>
          <p className="font-courier text-sm leading-relaxed text-[#333]/88">{r.paragraphe_explorer}</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {r.photos.slice(0, 5).map((src, i) => (
              <div
                key={i}
                className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-[#e8dfd6]"
              >
                <Image src={src} alt="" fill className="object-cover" sizes="144px" />
              </div>
            ))}
          </div>
          <section className="mt-6">
            <h3 className="font-courier text-[10px] font-bold uppercase text-[#A55734]">
              L’esprit du territoire
            </h3>
            <p className="mt-2 font-courier text-sm leading-relaxed text-[#333]/88">{r.intro_longue}</p>
          </section>
          <section className="mt-5">
            <h3 className="font-courier text-[10px] font-bold uppercase text-[#A55734]">
              Comment la parcourir
            </h3>
            <p className="mt-2 font-courier text-sm leading-relaxed text-[#333]/88">{r.ambiance_detail}</p>
          </section>
          <section className="mt-6">
            <h3 className="font-courier text-[10px] font-bold uppercase text-[#A55734]">
              Trois incontournables
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {r.trois_incontournables.map((nom) => {
                const slug = slugFromNom(nom);
                return (
                  <Link
                    key={nom}
                    href={`/ville/${slug}?from=inspiration`}
                    className="group overflow-hidden rounded-2xl border border-[#A55734]/12 bg-white shadow-sm"
                  >
                    <div className="relative h-[92px] w-full overflow-hidden bg-[#e8dfd6]">
                      <CityPhoto
                        stepId={slug}
                        ville={nom}
                        alt={nom}
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      <span className="absolute bottom-2 left-2 right-2 text-center font-courier text-[10px] font-bold text-white drop-shadow">
                        {nom}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          <aside className="mt-6 rounded-2xl border border-[#A55734]/12 bg-[#FFF8F0]/90 px-3 py-3">
            <p className="font-courier text-[10px] font-bold uppercase text-[#A55734]/75">Note terrain</p>
            <p className="mt-1 font-courier text-xs leading-relaxed text-[#333]/85">{r.note_terrain}</p>
          </aside>
        </>
      )}

      {lieuxCards.length > 0 && (
        <div className="mb-6">
          <p className="font-courier text-[10px] font-bold uppercase text-[#A55734]">
            Lieux & fiches ({lieuxCards.length})
          </p>
          <p className="mt-1 font-courier text-[10px] text-[#333]/55">
            Sélection selon tes filtres — meilleurs scores, même photos que les fiches ville.
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {lieuxCards.map((l) => (
              <Link
                key={l.slug}
                href={`/ville/${l.slug}?from=inspiration`}
                className="group flex w-[148px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#A55734]/15 bg-white shadow-sm transition hover:border-[#E07856]/45"
              >
                <div className="relative h-[88px] w-full overflow-hidden bg-[#e8dfd6]">
                  <CityPhoto
                    stepId={l.slug}
                    ville={l.nom}
                    alt={l.nom}
                    className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 right-2 line-clamp-2 font-courier text-[11px] font-bold leading-tight text-white drop-shadow">
                    {l.nom}
                  </span>
                </div>
                <div className="px-2 py-2">
                  <p className="line-clamp-2 font-courier text-[9px] text-[#333]/75">
                    {(l.source_type || "lieu").replace(/_/g, " ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="font-courier text-[10px] font-bold uppercase text-[#A55734]">
        Territoires ({filtered.length})
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {filtered.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPickTerritory(t.id)}
            className="flex w-[200px] shrink-0 flex-col rounded-xl border border-[#A55734]/15 bg-white p-3 text-left shadow-sm transition hover:border-[#E07856]/45"
          >
            <span className="font-courier text-xs font-bold text-[#A55734]">{t.name}</span>
            <span className="mt-1 line-clamp-3 font-courier text-[10px] leading-relaxed text-[#333]/80">
              {t.pitch}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenStars}
        className="mt-6 w-full rounded-full border-2 border-[#A55734]/30 py-3 font-courier text-sm font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
      >
        Itinéraires stars
      </button>

      <p
        id="liste-territoires-inspiration"
        className="mt-6 scroll-mt-32 font-courier text-[10px] font-bold uppercase text-[#A55734]/60"
      >
        Liste détaillée
      </p>
      <ul className="mt-2 space-y-2">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link
              href={`/planifier/inspiration/${t.id}`}
              className="block rounded-lg border border-[#A55734]/12 bg-white/80 px-3 py-2 font-courier text-xs text-[#333] hover:border-[#E07856]/40"
            >
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </SheetChrome>
  );
}

function PoiSheet({
  territoryId,
  onBack,
  onScroll,
  onDragClose,
}: {
  territoryId: string;
  onBack: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const t = getTerritoryById(territoryId);
  if (!t) return null;

  return (
    <SheetChrome
      onBack={onBack}
      onScroll={onScroll}
      onDragClose={onDragClose}
    >
      <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#e8dfd6]">
        <Image
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-courier text-lg font-bold text-[#A55734]">{t.name}</h2>
        <FavoriteButton kind="territory" refId={t.id} label={t.name} />
      </div>
      <p className="mt-3 font-courier text-sm leading-relaxed text-[#333]">{t.pitch}</p>
      <ul className="mt-4 space-y-1 font-courier text-xs text-[#333]/85">
        {t.markers.map((m) => (
          <li key={m}>· {m}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/planifier/inspiration/${t.id}`}
          className="rounded-full border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-4 py-2 font-courier text-xs font-bold text-white"
        >
          Fiche complète
        </Link>
        <Link
          href={`/planifier/zone?territoire=${encodeURIComponent(t.id)}`}
          className="rounded-full border border-[#A55734]/35 px-4 py-2 font-courier text-xs font-bold text-[#A55734]"
        >
          Créer un voyage
        </Link>
      </div>
    </SheetChrome>
  );
}

function StarListSheet({
  regionId,
  onBack,
  onPick,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  onBack: () => void;
  onPick: (id: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const items = starItinerariesByRegion(regionId);

  return (
    <SheetChrome
      onBack={onBack}
      tall
      onScroll={onScroll}
      onDragClose={onDragClose}
    >
      <h2 className="mb-4 font-courier text-lg font-bold text-[#A55734]">
        Itinéraires stars
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((s) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => onPick(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(s.id);
              }
            }}
            className="cursor-pointer overflow-hidden rounded-2xl border border-[#A55734]/15 bg-white text-left shadow-sm transition hover:border-[#E07856]/45"
          >
            <div className="relative aspect-[16/10] bg-[#e8dfd6]">
              <Image src={s.coverPhoto} alt="" fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-courier text-sm font-bold text-[#333]">{s.name}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <FavoriteButton kind="star_itinerary" refId={s.id} label={s.name} />
                </span>
              </div>
              <p className="mt-1 line-clamp-2 font-courier text-[11px] text-[#333]/80">
                {s.shortDescription}
              </p>
              {s.durationHint && (
                <p className="mt-2 font-courier text-[10px] text-[#A55734]/75">{s.durationHint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="font-courier text-sm text-[#333]/70">
          Aucun itinéraire star pour cette région pour le moment.
        </p>
      )}
    </SheetChrome>
  );
}

function StarDetailSheet({
  itineraryId,
  onBack,
  onScroll,
  onDragClose,
}: {
  itineraryId: string;
  onBack: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const s = starItineraryById(itineraryId);
  if (!s) return null;

  const coords = s.geometry.coordinates;

  return (
    <SheetChrome
      onBack={onBack}
      tall
      onScroll={onScroll}
      onDragClose={onDragClose}
    >
      <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#e8dfd6]">
        <Image src={s.coverPhoto} alt="" fill className="object-cover" sizes="100vw" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-courier text-lg font-bold text-[#A55734]">{s.name}</h2>
          {s.durationHint && (
            <p className="mt-1 font-courier text-xs text-[#333]/70">{s.durationHint}</p>
          )}
        </div>
        <FavoriteButton kind="star_itinerary" refId={s.id} label={s.name} />
      </div>
      <p className="mt-3 font-courier text-sm leading-relaxed text-[#333]">{s.shortDescription}</p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {s.photos.map((src, i) => (
          <div key={i} className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-[#e8dfd6]">
            <Image src={src} alt="" fill className="object-cover" sizes="128px" />
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-courier text-xs font-bold uppercase text-[#A55734]">Étapes</h3>
      <ol className="mt-2 space-y-2">
        {coords.map((c, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-lg border border-[#A55734]/12 bg-white/80 px-3 py-2 font-courier text-xs text-[#333]"
          >
            <span className="font-bold text-[#E07856]">{i + 1}</span>
            <span>
              Point d’étape {i + 1} — {c[1].toFixed(2)}°N, {c[0].toFixed(2)}°E
            </span>
          </li>
        ))}
      </ol>
    </SheetChrome>
  );
}
