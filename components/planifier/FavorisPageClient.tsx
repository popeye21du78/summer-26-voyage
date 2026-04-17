"use client";

import Image from "next/image";
import Link from "next/link";
import { CityPhoto } from "@/components/CityPhoto";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MapPin, Sparkles, Trash2, Compass } from "lucide-react";
import { getRegionEditorial } from "@/content/inspiration/regions";
import {
  getFavoritesForPrefill,
  listFavorites,
  removeFavorite,
  updateFavoriteStatus,
  type FavoriteStatus,
  type PlanifierFavorite,
} from "@/lib/planifier-favorites";
import { INSPI_CTA_GRADIENT } from "@/components/planifier/inspiration/inspirationEditorialUi";

const STATUS_LABELS: Record<FavoriteStatus, string> = {
  inspiration: "Envie",
  soft: "Si possible",
  hard: "Indispensable",
};

export default function FavorisPageClient() {
  const [items, setItems] = useState<PlanifierFavorite[]>(() => listFavorites());
  const [prefill, setPrefill] = useState(() => getFavoritesForPrefill());

  const refresh = useCallback(() => {
    setItems(listFavorites());
    setPrefill(getFavoritesForPrefill());
  }, []);

  const { regions, lieux, parcours } = useMemo(() => {
    return {
      regions: items.filter((f) => f.kind === "map_region"),
      lieux: items.filter((f) => f.kind === "place" || f.kind === "territory"),
      parcours: items.filter((f) => f.kind === "star_itinerary" || f.kind === "route_idea"),
    };
  }, [items]);

  return (
    <main className="page-under-header min-h-[70vh] bg-gradient-to-br from-[#8a5344] via-[#5c3d32] to-[#4a2820]">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/planifier"
          className="font-courier text-xs font-bold uppercase tracking-wide text-[#fde8e0]/80 underline decoration-[#f5c4b8]/30"
        >
          Hub planifier
        </Link>
        <h1 className="mt-5 font-courier text-2xl font-bold uppercase tracking-wide text-[#FFFBF7]">
          Mes envies
        </h1>
        <p className="mt-2 font-courier text-sm leading-relaxed text-[#e8d4cb]/90">
          Régions, lieux et pistes — tout ce qui te fait envie, en un coup d’œil.
        </p>

        {prefill && (prefill.territoryIds.length > 0 || prefill.hardPlaceLabels.length > 0) && (
          <div className="mt-6 rounded-2xl border border-[#f5c4b8]/25 bg-[#6b5a50]/35 p-4 font-courier text-xs text-[#fde8e0]/95 backdrop-blur-sm">
            <p className="font-bold uppercase tracking-wide text-[#f5c4b8]">Pré-remplissage</p>
            {prefill.territoryIds.length > 0 && (
              <p className="mt-2">
                Territoires : {prefill.territoryIds.join(", ")} —{" "}
                <Link href="/planifier/zone" className="underline">
                  flux zone
                </Link>
              </p>
            )}
            {prefill.hardPlaceLabels.length > 0 && (
              <p className="mt-1">
                Lieux : {prefill.hardPlaceLabels.join(", ")} —{" "}
                <Link href="/planifier/lieux" className="underline">
                  flux lieux
                </Link>
              </p>
            )}
          </div>
        )}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-[0.2em] text-[#f5c4b8]">
            <Compass className="h-4 w-4" aria-hidden />
            Régions
          </h2>
          <div className="mt-4 space-y-3">
            {regions.length === 0 ? (
              <p className="font-courier text-sm text-[#c9b8ad]/85">Aucune région pour l’instant.</p>
            ) : (
              regions.map((f) => (
                <RegionFavoriteCard key={f.id} fav={f} onRemoved={refresh} />
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-[0.2em] text-[#f5c4b8]">
            <MapPin className="h-4 w-4" aria-hidden />
            Lieux & territoires
          </h2>
          <div className="mt-4 space-y-3">
            {lieux.length === 0 ? (
              <p className="font-courier text-sm text-[#c9b8ad]/85">Aucune fiche sauvegardée.</p>
            ) : (
              lieux.map((f) => (
                <PlaceFavoriteCard key={f.id} fav={f} onRemoved={refresh} />
              ))
            )}
          </div>
        </section>

        <section className="mt-10 pb-12">
          <h2 className="flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-[0.2em] text-[#f5c4b8]">
            <Sparkles className="h-4 w-4" aria-hidden />
            Itinéraires & idées
          </h2>
          <div className="mt-4 space-y-3">
            {parcours.length === 0 ? (
              <p className="font-courier text-sm text-[#c9b8ad]/85">Aucun itinéraire gardé.</p>
            ) : (
              parcours.map((f) => (
                <RouteFavoriteCard key={f.id} fav={f} onRemoved={refresh} />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function RegionFavoriteCard({
  fav,
  onRemoved,
}: {
  fav: PlanifierFavorite;
  onRemoved: () => void;
}) {
  const editorial = getRegionEditorial(fav.refId);
  const cover = editorial?.headerPhoto;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-[#f5e6dc]/15 bg-[#6b5a50]/40 shadow-lg backdrop-blur-sm"
    >
      <div className="relative h-[120px] w-full bg-[#4a3d38]">
        {cover ? (
          <Image src={cover} alt="" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#8b5e4f] to-[#5c4036]">
            <Heart className="h-10 w-10 text-white/40" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2a211c]/85 via-[#2a211c]/25 to-transparent" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center font-courier text-lg font-bold uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          {fav.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        <select
          value={fav.status}
          onChange={(e) => {
            updateFavoriteStatus(fav.id, e.target.value as FavoriteStatus);
            onRemoved();
          }}
          className="flex-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 font-courier text-[11px] text-[#FFFBF7]"
        >
          {(Object.keys(STATUS_LABELS) as FavoriteStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Link
          href="/planifier/inspiration"
          className={`rounded-full px-3 py-1.5 font-courier text-[11px] font-bold text-white ${INSPI_CTA_GRADIENT}`}
        >
          Carte
        </Link>
        <button
          type="button"
          onClick={() => {
            removeFavorite(fav.id);
            onRemoved();
          }}
          className="rounded-full p-2 text-[#f5c4b8] hover:bg-white/10"
          aria-label="Retirer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function PlaceFavoriteCard({
  fav,
  onRemoved,
}: {
  fav: PlanifierFavorite;
  onRemoved: () => void;
}) {
  const isTerritory = fav.kind === "territory";
  const href = isTerritory
    ? `/planifier/inspiration/${encodeURIComponent(fav.refId)}`
    : `/ville/${encodeURIComponent(fav.refId)}`;

  return (
    <motion.div
      layout
      className="flex items-stretch gap-3 overflow-hidden rounded-2xl border border-[#f5e6dc]/15 bg-[#6b5a50]/35 p-3 backdrop-blur-sm"
    >
      <div className="relative h-[88px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-[#4a3d38]">
        {isTerritory ? (
          <Image
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=70"
            alt=""
            fill
            className="object-cover"
            sizes="100px"
          />
        ) : (
          <CityPhoto
            stepId={fav.refId}
            ville={fav.label}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="font-courier text-sm font-bold text-[#FFFBF7]">{fav.label}</p>
          <p className="font-courier text-[10px] uppercase tracking-wide text-[#c9b8ad]/80">
            {isTerritory ? "Territoire" : "Lieu"}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link href={href} className="font-courier text-[11px] font-bold text-[#f5c4b8] underline">
            Voir la fiche
          </Link>
          <button
            type="button"
            onClick={() => {
              removeFavorite(fav.id);
              onRemoved();
            }}
            className="rounded-full p-1.5 text-[#f5c4b8] hover:bg-white/10"
            aria-label="Retirer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RouteFavoriteCard({
  fav,
  onRemoved,
}: {
  fav: PlanifierFavorite;
  onRemoved: () => void;
}) {
  return (
    <motion.div
      layout
      className="rounded-2xl border border-[#f5e6dc]/15 bg-[#6b5a50]/35 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-courier text-sm font-bold text-[#FFFBF7]">{fav.label}</p>
          <p className="mt-1 font-courier text-[10px] uppercase tracking-wide text-[#c9b8ad]/85">
            {fav.kind === "star_itinerary" ? "Itinéraire star" : "Idée de parcours"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            removeFavorite(fav.id);
            onRemoved();
          }}
          className="rounded-full p-2 text-[#f5c4b8] hover:bg-white/10"
          aria-label="Retirer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <Link
        href="/planifier/inspiration"
        className={`mt-3 inline-block rounded-full px-3 py-1.5 font-courier text-[11px] font-bold text-white ${INSPI_CTA_GRADIENT}`}
      >
        Ouvrir sur la carte
      </Link>
    </motion.div>
  );
}
