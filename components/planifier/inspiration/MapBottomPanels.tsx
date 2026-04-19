"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
import type {
  StarItinerariesEditorialFile,
  StarItineraryEditorialItem,
} from "@/types/star-itineraries-editorial";
import { CityPhoto } from "@/components/CityPhoto";
import { slugFromNom } from "@/lib/slug-from-nom";
import FavoriteButton from "./FavoriteButton";
import { themeCardImageUrl } from "@/lib/star-itinerary-theme-card-images";
import { useRegionCardResolvedPhoto } from "@/hooks/useRegionCardResolvedPhoto";
import { useCuratedAssignmentPhoto } from "@/hooks/useCuratedInspirationPhotos";
import type { StarItineraryStopDto } from "@/types/inspiration-star-map";
import {
  INSPI_ACCENT_LINE,
  INSPI_CTA_GRADIENT,
  INSPI_SURFACE_CARD,
  INSPI_SURFACE_SHEET,
  INSPI_TEXT_MUTED,
  INSPI_TEXT_PRIMARY,
  InspirationRegionHero,
} from "./inspirationEditorialUi";
import ExploreRegionContent from "./explore-region/ExploreRegionContent";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import { withReturnTo } from "@/lib/return-to";

type SlimLieuCard = {
  slug: string;
  nom: string;
  source_type: string;
  description_courte?: string;
};

/** Même alternance que les pages Ville (VilleDescriptionClient) */
const BAND_LIGHT =
  "border border-[#E07856]/25 bg-gradient-to-br from-[#FFF8F0] to-[#FAF4F0] shadow-sm";

function SheetChrome({
  children,
  onBack,
  onScroll,
  onDragClose,
  /** Carte/fiche : une seule poignée hors sheet (jointure) — pas de 2e barre ni texte d’aide. */
  variant = "default",
  /** Fiche région pleine : masquer le micro-texte technique sous la poignée. */
  showDragHint = true,
  /** Premier bloc en pleine largeur (hero image) — pas de padding scroll initial. */
  fullBleedContent = false,
  /** Aligné landing / accueil : fond brique–noir chaud, moins blanc isolé. */
  sheetTone = "default",
}: {
  children: React.ReactNode;
  onBack?: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
  variant?: "default" | "split";
  showDragHint?: boolean;
  fullBleedContent?: boolean;
  sheetTone?: "default" | "darkWarm";
}) {
  const isSplit = variant === "split";
  const darkWarm = sheetTone === "darkWarm";
  const sheetBg = isSplit
    ? darkWarm
      ? INSPI_SURFACE_SHEET
      : "bg-[#111111]"
    : darkWarm
      ? INSPI_SURFACE_SHEET
      : "bg-[#FFFBF8]";
  return (
    <motion.div
      initial={isSplit ? { opacity: 0.98, y: 10 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={isSplit ? { opacity: 0.96, y: 12 } : { opacity: 0, y: 28 }}
      transition={{
        duration: isSplit ? 0.7 : 0.45,
        ease: [0.25, 0.85, 0.35, 1],
      }}
      className={`relative flex h-full min-h-0 flex-col rounded-t-3xl border shadow-[0_-6px_32px_rgba(0,0,0,0.28)] ${
        darkWarm ? "border-white/10" : "border-[#E07856]/15"
      } ${sheetBg}`}
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
          <div
            className={`h-1.5 w-16 rounded-full shadow-sm ${darkWarm ? "bg-white/35" : "bg-[#E07856]/45"}`}
          />
        </motion.div>
      ) : !isSplit ? (
        <div className="flex shrink-0 justify-center pt-2">
          <div
            className={`h-1.5 w-11 rounded-full ${darkWarm ? "bg-white/25" : "bg-[#E07856]/30"}`}
          />
        </div>
      ) : null}
      {!isSplit && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 font-courier text-xs font-bold text-[#E07856] shadow-sm hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
      )}
      {!isSplit && showDragHint && (
        <p
          className={`mt-0.5 text-center font-courier text-[10px] ${darkWarm ? "text-white/35" : "text-white/80/45"}`}
        >
          Tire la poignée entre carte et fiche pour ajuster la hauteur · glisser vite vers le bas pour fermer
        </p>
      )}
      <div
        onScroll={onScroll}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-10 ${
          fullBleedContent
            ? "px-0 pt-0"
            : isSplit
              ? "px-3 pt-3"
              : "px-4 pt-6"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

type PanelsProps = {
  onSheetScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  starRouteDetail?: {
    regionId: string;
    slug: string;
    stops: StarItineraryStopDto[];
  } | null;
};

export default function MapBottomPanels({ onSheetScroll, starRouteDetail }: PanelsProps) {
  const ctx = useInspirationMap();
  const {
    top,
    goBack,
    goExploreRegion,
    expandRegionExploreToFull,
    openRegionMapFullscreen,
    openStarList,
    selectStarItinerary,
    selectEditorialStarItinerary,
    selectTerritoryPoi,
    resetFrance,
  } = ctx;

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
          onOpenMap={openRegionMapFullscreen}
          onScroll={onSheetScroll}
          onDragClose={resetFrance}
        />
      )}
      {top.screen === "region-explore" && (
        <ExploreRegion
          key="explore"
          regionId={top.regionId}
          essentialsOnly={top.essentialsOnly === true}
          ambiance={ctx.ambiance}
          setAmbiance={ctx.setAmbiance}
          duration={ctx.duration}
          territories={allTerritories}
          onBack={goBack}
          onOpenStars={openStarList}
          onOpenMap={openRegionMapFullscreen}
          onPickTerritory={selectTerritoryPoi}
          onExpandFull={expandRegionExploreToFull}
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
          starRouteDetail={starRouteDetail}
          onBack={goBack}
          onPickLegacy={(id) => selectStarItinerary(id)}
          onPickEditorial={(slug) => selectEditorialStarItinerary(slug)}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
      {top.screen === "star-detail" && top.kind === "legacy" && (
        <StarDetailSheetLegacy
          key="stard"
          itineraryId={top.itineraryId}
          onBack={goBack}
          onScroll={onSheetScroll}
          onDragClose={goBack}
        />
      )}
      {top.screen === "star-detail" && top.kind === "editorial" && (
        <StarDetailSheetEditorial
          key="starde"
          regionId={top.regionId}
          editorialSlug={top.editorialSlug}
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
  onOpenMap,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  onExplore: () => void;
  onStars: () => void;
  onOpenMap: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const r = getRegionEditorial(regionId);
  const { src: heroImageSrc, resolveDone } = useRegionCardResolvedPhoto({
    id: r?.id ?? regionId,
    headerPhoto: r?.headerPhoto ?? "",
  });
  if (!r) return null;
  const heroSrc = resolveDone ? (heroImageSrc ?? r.headerPhoto) : null;

  return (
    <SheetChrome
      variant="split"
      fullBleedContent
      sheetTone="darkWarm"
      onScroll={onScroll}
      onDragClose={onDragClose}
      showDragHint
    >
      <div className={`min-h-0 flex-1 ${INSPI_TEXT_PRIMARY}`}>
        <InspirationRegionHero
          imageSrc={heroSrc}
          regionName={r.name}
          tagline={r.accroche_carte}
          density="preview"
          showBackButton={false}
        />
        <div className="space-y-3 px-4 pb-6 pt-3">
          <p className={`text-center font-courier text-[10px] leading-snug ${INSPI_TEXT_MUTED}`}>
            Tire la poignée vers le haut pour ouvrir les incontournables
          </p>
          <button
            type="button"
            onClick={onExplore}
            className={`w-full rounded-2xl py-3.5 font-courier text-sm font-bold uppercase tracking-wide text-white transition hover:brightness-110 active:scale-[0.99] ${INSPI_CTA_GRADIENT}`}
          >
            Voir les incontournables
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onStars}
              className={`rounded-xl border py-2.5 font-courier text-[11px] font-bold uppercase tracking-wide text-[#FFFBF7] transition hover:bg-white/10 ${INSPI_SURFACE_CARD}`}
            >
              Itinéraires stars
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              className={`rounded-xl border border-dashed border-white/25 py-2.5 font-courier text-[11px] font-bold text-[#c9b8ad] transition hover:border-white/40`}
            >
              Carte plein écran
            </button>
          </div>
          <div
            className={`flex flex-wrap items-center justify-between gap-3 border-t pt-3 ${INSPI_ACCENT_LINE}`}
          >
            <Link
              href="/planifier/favoris"
              className={`font-courier text-[11px] underline decoration-white/25 underline-offset-4 transition hover:text-[#F5C4B8] ${INSPI_TEXT_MUTED}`}
            >
              Mes envies
            </Link>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
              <span className={`font-courier text-[10px] ${INSPI_TEXT_MUTED}`}>J’y suis déjà allé</span>
            </div>
          </div>
        </div>
      </div>
    </SheetChrome>
  );
}

function ExploreRegion({
  regionId,
  essentialsOnly,
  ambiance,
  setAmbiance,
  duration,
  territories,
  onBack,
  onOpenStars,
  onOpenMap,
  onPickTerritory,
  onExpandFull,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  essentialsOnly: boolean;
  ambiance: InspirationAmbianceFilter[];
  setAmbiance: Dispatch<SetStateAction<InspirationAmbianceFilter[]>>;
  duration: InspirationDurationFilter | null;
  territories: EditorialTerritory[];
  onBack: () => void;
  onOpenStars: () => void;
  onOpenMap: () => void;
  onPickTerritory: (id: string) => void;
  onExpandFull: () => void;
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
      onScroll={onScroll}
      onDragClose={onDragClose}
      showDragHint={false}
      fullBleedContent
      sheetTone="darkWarm"
    >
      {r ? (
        <ExploreRegionContent
          regionId={regionId}
          r={r}
          filtered={filtered}
          lieuxCards={lieuxCards}
          ambiance={ambiance}
          setAmbiance={setAmbiance}
          essentialsOnly={essentialsOnly}
          onBack={onBack}
          onOpenStars={onOpenStars}
          onOpenMap={onOpenMap}
          onPickTerritory={onPickTerritory}
          onExpandFull={onExpandFull}
        />
      ) : (
        <p className={`px-4 py-6 font-courier text-sm ${INSPI_TEXT_MUTED}`}>
          Contenu éditorial à venir pour cette zone.
        </p>
      )}
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
      showDragHint={false}
      sheetTone="darkWarm"
    >
      <div className={`space-y-4 ${INSPI_TEXT_PRIMARY}`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#5c4d45] ring-1 ring-[#f5e6dc]/15">
          <Image
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3d3430]/90 to-transparent" />
        </div>
        <div className="flex items-start justify-between gap-2">
          <h2 className={`font-courier text-xl font-bold uppercase tracking-wide text-[#FFFBF7]`}>
            {t.name}
          </h2>
          <FavoriteButton
            kind="territory"
            refId={t.id}
            label={t.name}
            className="border-white/25 bg-[#6b5a50]/50 text-[#fde8e0]"
          />
        </div>
        <p className={`font-courier text-sm leading-relaxed ${INSPI_TEXT_MUTED}`}>{t.pitch}</p>
        <div className="flex flex-wrap gap-2">
          {t.filter_tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-courier text-[10px] uppercase tracking-wide text-[#f5c4b8]/90"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={`/planifier/inspiration/${t.id}`}
            className={`rounded-full px-4 py-2 font-courier text-xs font-bold text-white ${INSPI_CTA_GRADIENT}`}
          >
            Voir plus
          </Link>
          <Link
            href={`/planifier/zone?territoire=${encodeURIComponent(t.id)}`}
            className={`rounded-full border border-[#f5c4b8]/35 px-4 py-2 font-courier text-xs font-bold text-[#fde8e0]`}
          >
            Créer un voyage
          </Link>
        </div>
      </div>
    </SheetChrome>
  );
}

const DURATION_ORDER = ["3 jours", "7 jours", "10 jours"] as const;

async function fetchRegionEditorial(regionId: string): Promise<StarItinerariesEditorialFile> {
  const r = await fetch(
    `/api/inspiration/region-editorial?regionId=${encodeURIComponent(regionId)}`,
    { cache: "no-store" }
  );
  if (!r.ok) return { itineraries: [] };
  return (await r.json()) as StarItinerariesEditorialFile;
}

function StarListSheet({
  regionId,
  starRouteDetail,
  onBack,
  onPickLegacy,
  onPickEditorial,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  starRouteDetail?: {
    regionId: string;
    slug: string;
    stops: StarItineraryStopDto[];
  } | null;
  onBack: () => void;
  onPickLegacy: (id: string) => void;
  onPickEditorial: (slug: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const { setStarListPreviewLineSlug } = useInspirationMap();
  const returnBase = useReturnBase();
  const [editorialPack, setEditorialPack] = useState<StarItinerariesEditorialFile | null>(null);
  const [editorialLoading, setEditorialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEditorialLoading(true);
    fetchRegionEditorial(regionId)
      .then((data) => {
        if (!cancelled) setEditorialPack(data);
      })
      .catch(() => {
        if (!cancelled) setEditorialPack({ itineraries: [] });
      })
      .finally(() => {
        if (!cancelled) setEditorialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const editorial = editorialPack?.itineraries ?? [];
  const legacy = starItinerariesByRegion(regionId);
  const hasEditorial = editorial.length > 0;

  const themes = useMemo(() => {
    const u = new Set<string>();
    editorial.forEach((i) => u.add(i.themeTitle));
    return [...u].sort((a, b) => a.localeCompare(b, "fr"));
  }, [editorial]);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedDur, setSelectedDur] = useState<string | null>(null);

  const durationsForTheme = useMemo(() => {
    if (!selectedTheme) return [];
    const set = new Set<string>();
    editorial.forEach((i) => {
      if (i.themeTitle === selectedTheme) set.add(i.durationHint);
    });
    const rest = [...set].filter(
      (d) => !DURATION_ORDER.includes(d as (typeof DURATION_ORDER)[number])
    );
    return [
      ...DURATION_ORDER.filter((d) => set.has(d)),
      ...rest.sort((a, b) => a.localeCompare(b, "fr")),
    ];
  }, [editorial, selectedTheme]);

  const matched = useMemo(() => {
    if (!selectedTheme || !selectedDur) return null;
    return (
      editorial.find(
        (i) => i.themeTitle === selectedTheme && i.durationHint === selectedDur
      ) ?? null
    );
  }, [editorial, selectedTheme, selectedDur]);

  useEffect(() => {
    setStarListPreviewLineSlug(matched?.itinerarySlug ?? null);
  }, [matched?.itinerarySlug, setStarListPreviewLineSlug]);

  const pickTheme = (t: string) => {
    setSelectedTheme(t);
    setSelectedDur(null);
  };

  const backToThemes = () => {
    setSelectedTheme(null);
    setSelectedDur(null);
  };

  const stepSlugsCsv = matched?.steps?.map((s) => s.slug).join(",") ?? "";
  const voyageHeroUrl = useCuratedAssignmentPhoto(
    matched ? `voyage-hero:${regionId}:${matched.itinerarySlug}` : null,
    regionId,
    stepSlugsCsv || undefined
  );
  const routeStops =
    starRouteDetail?.regionId === regionId && starRouteDetail.slug === matched?.itinerarySlug
      ? starRouteDetail.stops
      : [];

  return (
    <SheetChrome onBack={onBack} onScroll={onScroll} onDragClose={onDragClose}>
      <h2 className="mb-1 font-courier text-lg font-bold text-[#E07856]">Itinéraires stars</h2>
      <p className="mb-5 font-courier text-[11px] leading-relaxed text-white/80/72">
        Thème → durée → parcours sur la carte.
      </p>

      {editorialLoading && (
        <p className="mb-6 font-courier text-sm text-white/80/65">Chargement des parcours…</p>
      )}

      {!editorialLoading && !hasEditorial && (
        <div className="mb-6 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-[#FFF8F0] px-4 py-3 shadow-sm">
          <p className="font-courier text-sm font-bold text-amber-950/90">Contenu en attente</p>
          <p className="mt-1.5 font-courier text-[11px] leading-relaxed text-white/80/88">
            Aucun itinéraire dans le JSON de cette région (fichier vide ou non enregistré). Après avoir
            collé le JSON dans{" "}
            <code className="rounded bg-white/80 px-1 text-[10px]">
              content/inspiration/star-itineraries-editorial/{regionId}.json
            </code>
            , enregistre puis rafraîchis la page (F5).
          </p>
        </div>
      )}

      {!editorialLoading && hasEditorial && (
        <>
          {!selectedTheme && (
            <div className="space-y-3">
              <p className="font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-[#E07856]/85">
                Grand thème
              </p>
              <div className="grid gap-3">
                {themes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pickTheme(t)}
                    className="group relative h-36 w-full overflow-hidden rounded-2xl border border-[#E07856]/15 text-left shadow-md transition hover:border-[#E07856]/45 hover:shadow-lg"
                  >
                    <Image
                      src={themeCardImageUrl(t)}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width:640px) 100vw, 100vw"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/35" />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center font-courier text-base font-bold leading-snug text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
                      {t}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTheme && !selectedDur && (
            <div>
              <button
                type="button"
                onClick={backToThemes}
                className="mb-4 font-courier text-xs font-bold text-[#E07856] underline underline-offset-2"
              >
                ← Changer de thème
              </button>
              <p className="mb-1 font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-[#E07856]/85">
                Durée pour « {selectedTheme} »
              </p>
              <p className="mb-4 font-courier text-[11px] text-white/80/75">
                Choisis la durée : le parcours et le texte apparaîtront ensuite.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {durationsForTheme.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDur(d)}
                    className="rounded-2xl border-2 border-[#E07856]/18 bg-gradient-to-br from-white to-[#FAF4F0] px-4 py-5 text-center font-courier text-sm font-bold text-white/80 shadow-sm transition hover:border-[#E07856]/55 hover:shadow-md"
                  >
                    {d}
                  </button>
                ))}
              </div>
              {durationsForTheme.length === 0 && (
                <p className="mt-4 font-courier text-sm text-white/80/70">
                  Aucune durée pour ce thème dans les données.
                </p>
              )}
            </div>
          )}

          {selectedTheme && selectedDur && matched && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDur(null)}
                  className="font-courier text-xs font-bold text-[#E07856] underline underline-offset-2"
                >
                  ← Autre durée
                </button>
                <button
                  type="button"
                  onClick={backToThemes}
                  className="font-courier text-xs font-bold text-[#E07856]/80 underline underline-offset-2"
                >
                  Changer de thème
                </button>
              </div>
              {voyageHeroUrl ? (
                <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-[#E07856]/15 shadow-md">
                  <Image src={voyageHeroUrl} alt="" fill className="object-cover" sizes="100vw" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/30" />
                  <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center font-courier text-xs font-bold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                    {matched.tripTitle}
                  </p>
                </div>
              ) : null}
              {routeStops.length > 0 && (
                <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 pt-1 [-webkit-overflow-scrolling:touch]">
                  {routeStops.map((st) => (
                    <Link
                      key={st.slug}
                      href={withReturnTo(
                        `/inspirer/ville/${encodeURIComponent(st.slug)}?from=inspiration`,
                        returnBase
                      )}
                      className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center"
                    >
                      <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full border-[3px] border-white shadow-md ring-2 ring-[#A55734]/25">
                        {st.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={st.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E07856] to-[#A55734] font-courier text-lg font-bold text-white">
                            {st.order}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#E07856] px-0.5 font-courier text-[9px] font-bold text-white">
                          {st.order}
                        </span>
                      </div>
                      <span className="line-clamp-2 font-courier text-[9px] font-bold leading-tight text-white/80">
                        {st.nom}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border border-[#E07856]/25 bg-gradient-to-br from-[#FFF8F0] to-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-[#E07856]">
                      {matched.themeTitle} · {matched.durationHint}
                    </p>
                    <h3 className="mt-1 font-courier text-lg font-bold leading-snug text-white/80">
                      {matched.tripTitle}
                    </h3>
                  </div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton
                      kind="star_itinerary"
                      refId={`editorial:${regionId}:${matched.itinerarySlug}`}
                      label={matched.tripTitle}
                    />
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 font-courier text-sm leading-relaxed text-white/80/88">
                  {matched.summary}
                </p>
                <button
                  type="button"
                  onClick={() => onPickEditorial(matched.itinerarySlug)}
                  className="mt-5 w-full rounded-full border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] py-3 font-courier text-sm font-bold text-white shadow-md transition hover:opacity-95"
                >
                  Fiche complète
                </button>
              </div>
            </div>
          )}

          {selectedTheme && selectedDur && !matched && (
            <div>
              <button
                type="button"
                onClick={() => setSelectedDur(null)}
                className="mb-3 font-courier text-xs font-bold text-[#E07856] underline underline-offset-2"
              >
                ← Autre durée
              </button>
              <p className="font-courier text-sm text-white/80/70">
                Aucun itinéraire pour cette combinaison thème / durée.
              </p>
            </div>
          )}
        </>
      )}

      {legacy.length > 0 && (
        <div className={hasEditorial ? "mt-10 border-t border-[#E07856]/12 pt-8" : ""}>
          <h3 className="mb-3 font-courier text-xs font-bold uppercase tracking-wide text-[#E07856]/80">
            Aperçus (ancien format)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {legacy.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onPickLegacy(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPickLegacy(s.id);
                  }
                }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-[#E07856]/15 bg-white text-left shadow-sm transition hover:border-[#E07856]/45"
              >
                <div className="relative aspect-[16/10] bg-[#1c1c1c]">
                  <Image
                    src={s.coverPhoto}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 100vw, 50vw"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-courier text-sm font-bold text-white/80">{s.name}</span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton kind="star_itinerary" refId={s.id} label={s.name} />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 font-courier text-[11px] text-white/80/80">
                    {s.shortDescription}
                  </p>
                  {s.durationHint && (
                    <p className="mt-2 font-courier text-[10px] text-[#E07856]/75">{s.durationHint}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasEditorial && legacy.length === 0 && (
        <p className="font-courier text-sm text-white/80/70">
          Aucun itinéraire disponible pour cette région pour le moment.
        </p>
      )}
    </SheetChrome>
  );
}

function StarDetailSheetLegacy({
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
    <SheetChrome onBack={onBack} onScroll={onScroll} onDragClose={onDragClose}>
      <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#1c1c1c]">
        <Image src={s.coverPhoto} alt="" fill className="object-cover" sizes="100vw" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-courier text-lg font-bold text-[#E07856]">{s.name}</h2>
          {s.durationHint && (
            <p className="mt-1 font-courier text-xs text-white/80/70">{s.durationHint}</p>
          )}
        </div>
        <FavoriteButton kind="star_itinerary" refId={s.id} label={s.name} />
      </div>
      <p className="mt-3 font-courier text-sm leading-relaxed text-white/80">{s.shortDescription}</p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {s.photos.map((src, i) => (
          <div key={i} className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-[#1c1c1c]">
            <Image src={src} alt="" fill className="object-cover" sizes="128px" />
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-courier text-xs font-bold uppercase text-[#E07856]">Étapes (tracé carte)</h3>
      <ol className="mt-2 space-y-2">
        {coords.map((c, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-lg border border-[#E07856]/12 bg-white/80 px-3 py-2 font-courier text-xs text-white/80"
          >
            <span className="font-bold text-[#E07856]">{i + 1}</span>
            <span>
              Point {i + 1} — {c[1].toFixed(2)}°N, {c[0].toFixed(2)}°E
            </span>
          </li>
        ))}
      </ol>
    </SheetChrome>
  );
}

function StarDetailSheetEditorial({
  regionId,
  editorialSlug,
  onBack,
  onScroll,
  onDragClose,
}: {
  regionId: string;
  editorialSlug: string;
  onBack: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onDragClose?: () => void;
}) {
  const [item, setItem] = useState<StarItineraryEditorialItem | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setItem(undefined);
    fetchRegionEditorial(regionId)
      .then((pack) => {
        if (cancelled) return;
        const found =
          pack.itineraries?.find((i) => i.itinerarySlug === editorialSlug) ?? null;
        setItem(found);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId, editorialSlug]);

  if (item === undefined) {
    return (
      <SheetChrome onBack={onBack} onScroll={onScroll} onDragClose={onDragClose}>
        <p className="font-courier text-sm text-white/80/70">Chargement du parcours…</p>
      </SheetChrome>
    );
  }

  if (!item) {
    return (
      <SheetChrome onBack={onBack} onScroll={onScroll} onDragClose={onDragClose}>
        <p className="font-courier text-sm text-white/80/70">
          Parcours introuvable. Enregistre le JSON régional puis rafraîchis la page.
        </p>
      </SheetChrome>
    );
  }

  const favRef = `editorial:${regionId}:${item.itinerarySlug}`;

  return (
    <SheetChrome onBack={onBack} onScroll={onScroll} onDragClose={onDragClose}>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-[#E07856]/15 bg-gradient-to-br from-[#5D3A1A]/15 via-[#FFF8F0] to-[#E07856]/10">
        <div className="aspect-[16/7] w-full min-h-[120px]" aria-hidden />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 via-black/10 to-transparent p-4">
          <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-white/90">
            {item.themeTitle}
          </p>
          <h2 className="mt-1 font-courier text-lg font-bold leading-tight text-white drop-shadow">
            {item.tripTitle}
          </h2>
          <p className="mt-1 font-courier text-[11px] text-white/88">{item.durationHint}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="font-courier text-[11px] font-bold uppercase text-[#E07856]">Parcours éditorial</p>
        <FavoriteButton kind="star_itinerary" refId={favRef} label={item.tripTitle} />
      </div>

      <p className="mt-3 font-courier text-sm leading-relaxed text-white/80">{item.summary}</p>

      <div className={`mt-4 rounded-xl border px-3 py-3 ${BAND_LIGHT}`}>
        <p className="font-courier text-[10px] font-bold uppercase text-[#E07856]/85">Nuits</p>
        <p className="mt-1 font-courier text-xs leading-relaxed text-white/80/90">{item.overnightStyle}</p>
      </div>

      <h3 className="mt-6 font-courier text-xs font-bold uppercase text-[#E07856]">
        Étapes (ordre du parcours)
      </h3>
      <ol className="mt-2 space-y-2">
        {item.steps.map((st, i) => (
          <li
            key={`${st.slug}-${i}`}
            className="flex gap-3 rounded-lg border border-[#E07856]/12 bg-white/90 px-3 py-2.5 font-courier text-xs text-white/80"
          >
            <span className="shrink-0 font-bold text-[#E07856]">{i + 1}</span>
            <span className="leading-snug">{st.nom}</span>
          </li>
        ))}
      </ol>

      {item.suggestedPoiAdditions.length > 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-[#E07856]/25 bg-amber-50/50 px-3 py-3">
          <p className="font-courier text-[10px] font-bold uppercase tracking-wide text-amber-950/90">
            POI à ajouter au référentiel (suggestions)
          </p>
          <ul className="mt-2 space-y-2">
            {item.suggestedPoiAdditions.map((s, i) => (
              <li key={i} className="font-courier text-[11px] leading-relaxed text-white/80/92">
                <span className="font-bold text-[#E07856]">{s.nom}</span>
                <span className="text-white/80/55"> · {s.type}</span>
                <span className="mt-0.5 block text-white/80/78">{s.raison}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 font-courier text-[10px] leading-relaxed text-white/80/55">
        Le tracé orange sur la carte relie les lieux dans l’ordre (coordonnées issues du référentiel
        lieux).
      </p>
    </SheetChrome>
  );
}
