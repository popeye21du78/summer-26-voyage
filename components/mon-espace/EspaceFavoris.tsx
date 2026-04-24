"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Heart,
  MapPin,
  Route,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  listFavorites,
  removeFavorite,
  type PlanifierFavorite,
  type FavoriteKind,
} from "@/lib/planifier-favorites";
import { CityPhoto } from "@/components/CityPhoto";
import { mapRegionById, MAP_REGIONS } from "@/lib/inspiration-map-regions-config";

/**
 * Section « Coups de cœur & repères » de Mon espace.
 *
 * v2 (demande user) :
 *  - mieux rangée : regroupée par nature (Villes, Régions, Itinéraires stars,
 *    Repères, Idées de trajet) avec comptages,
 *  - recherche par texte (label),
 *  - filtre par catégorie (chips) + par région (chips) — les favoris sans
 *    région connue restent toujours visibles avec le filtre « Toutes »,
 *  - photos des villes directement dans la liste via `CityPhoto`.
 */

type Group = {
  key: FavoriteKind | "other";
  icon: typeof Heart;
  label: string;
  items: PlanifierFavorite[];
};

const KIND_META: Record<FavoriteKind, { label: string; icon: typeof Heart }> = {
  place: { label: "Villes", icon: MapPin },
  known_place: { label: "Déjà connus", icon: MapPin },
  territory: { label: "Territoires", icon: Compass },
  map_region: { label: "Régions", icon: Compass },
  star_itinerary: { label: "Itinéraires stars", icon: Star },
  route_idea: { label: "Idées de trajet", icon: Route },
};

function regionOfFavorite(fav: PlanifierFavorite): string | null {
  if (fav.kind === "map_region") return fav.refId;
  if (fav.kind === "territory") {
    const meta = fav.meta as { region_key?: string } | undefined;
    return meta?.region_key ?? null;
  }
  return null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function EspaceFavoris() {
  const [favorites, setFavorites] = useState<PlanifierFavorite[]>([]);
  const [query, setQuery] = useState("");
  const [activeKind, setActiveKind] = useState<FavoriteKind | "all">("all");
  const [activeRegion, setActiveRegion] = useState<string | "all">("all");

  useEffect(() => {
    setFavorites(listFavorites());
  }, []);

  function handleRemove(id: string) {
    removeFavorite(id);
    setFavorites(listFavorites());
  }

  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fav of favorites) {
      const r = regionOfFavorite(fav);
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return counts;
  }, [favorites]);

  const kindCounts = useMemo(() => {
    const counts = new Map<FavoriteKind, number>();
    for (const fav of favorites) {
      counts.set(fav.kind, (counts.get(fav.kind) ?? 0) + 1);
    }
    return counts;
  }, [favorites]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return favorites.filter((fav) => {
      if (activeKind !== "all" && fav.kind !== activeKind) return false;
      if (activeRegion !== "all") {
        if (regionOfFavorite(fav) !== activeRegion) return false;
      }
      if (q) {
        const hay = normalize(fav.label);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [favorites, activeKind, activeRegion, query]);

  const groups: Group[] = useMemo(() => {
    const order: FavoriteKind[] = [
      "place",
      "map_region",
      "territory",
      "star_itinerary",
      "route_idea",
      "known_place",
    ];
    return order
      .map((kind) => ({
        key: kind,
        icon: KIND_META[kind].icon,
        label: KIND_META[kind].label,
        items: filtered.filter((f) => f.kind === kind),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const total = favorites.length;
  const filteredCount = filtered.length;

  if (total === 0) {
    return (
      <section className="px-5 py-6">
        <h2 className="font-title mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
          <Heart className="h-4 w-4" />
          Coups de cœur & repères
        </h2>
        <div className="rounded-2xl border border-dashed border-white/8 px-6 py-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-[var(--color-accent-start)]/20" />
          <p className="mt-3 font-courier text-xs leading-relaxed text-white/40">
            Tes villes, régions et itinéraires sauvegardés depuis S&apos;inspirer
            apparaîtront ici.
          </p>
          <Link
            href="/inspirer"
            className="font-title mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-start)]/35 bg-[var(--color-accent-start)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-start)] transition hover:bg-[var(--color-accent-start)]/18"
          >
            Aller explorer
          </Link>
        </div>
      </section>
    );
  }

  const regionChips = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <section className="px-5 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-title flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
          <Heart className="h-4 w-4" />
          Coups de cœur & repères
        </h2>
        <span className="font-courier text-[10px] text-white/40">
          {filteredCount === total
            ? `${total} au total`
            : `${filteredCount} / ${total}`}
        </span>
      </div>

      {/* Barre de recherche */}
      <label className="relative mb-3 flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher une ville, une région…"
          className="w-full rounded-2xl border border-white/8 bg-white/5 py-2.5 pl-9 pr-9 font-courier text-sm text-white placeholder:text-white/30 focus:border-[var(--color-accent-start)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 rounded-full p-1 text-white/30 transition hover:text-white/70"
            aria-label="Effacer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {/* Chips : catégories */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterChip
          active={activeKind === "all"}
          onClick={() => setActiveKind("all")}
          label="Tout"
          count={total}
        />
        {(Object.keys(KIND_META) as FavoriteKind[]).map((kind) => {
          const c = kindCounts.get(kind) ?? 0;
          if (c === 0) return null;
          return (
            <FilterChip
              key={kind}
              active={activeKind === kind}
              onClick={() => setActiveKind(kind)}
              label={KIND_META[kind].label}
              count={c}
            />
          );
        })}
      </div>

      {/* Chips : régions (uniquement si au moins une région comptabilisée) */}
      {regionChips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <FilterChip
            active={activeRegion === "all"}
            onClick={() => setActiveRegion("all")}
            label="Toutes régions"
          />
          {regionChips.map(([id, c]) => {
            const meta = mapRegionById(id) ?? MAP_REGIONS.find((r) => r.id === id);
            const name = meta?.name ?? id;
            return (
              <FilterChip
                key={id}
                active={activeRegion === id}
                onClick={() => setActiveRegion(id)}
                label={name}
                count={c}
              />
            );
          })}
        </div>
      )}

      {/* Résultats */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/8 py-8 text-center">
          <p className="font-courier text-xs text-white/35">
            Aucun favori ne correspond à cette recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="font-title mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                <group.icon className="h-3.5 w-3.5" />
                {group.label}
                <span className="font-courier text-[10px] font-normal text-white/25">
                  · {group.items.length}
                </span>
              </p>

              {group.key === "place" || group.key === "known_place" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((fav) => (
                    <PlaceCard
                      key={fav.id}
                      fav={fav}
                      onRemove={() => handleRemove(fav.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {group.items.map((fav) => (
                    <GenericRow
                      key={fav.id}
                      fav={fav}
                      onRemove={() => handleRemove(fav.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-title inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
        active
          ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)]/18 text-[var(--color-accent-start)]"
          : "border-white/10 bg-white/3 text-white/55 hover:border-white/22 hover:text-white/80"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`font-courier text-[9px] font-normal ${active ? "text-[var(--color-accent-start)]/70" : "text-white/35"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function PlaceCard({
  fav,
  onRemove,
}: {
  fav: PlanifierFavorite;
  onRemove: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-white/3">
      <Link
        href={`/inspirer/ville/${fav.refId}`}
        className="block"
        aria-label={`Voir ${fav.label}`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-bg-secondary)]">
          <CityPhoto
            stepId={fav.refId}
            ville={fav.label}
            alt={fav.label}
            className="absolute inset-0 h-full w-full object-cover"
            imageLoading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <p className="font-title truncate text-[11px] font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {fav.label}
            </p>
            {fav.kind === "known_place" ? (
              <p className="font-courier text-[9px] text-white/65">Déjà connu</p>
            ) : (
              <p className="font-courier text-[9px] text-[var(--color-accent-start)]/85">
                {fav.status === "hard"
                  ? "Indispensable"
                  : fav.status === "soft"
                    ? "Envie"
                    : "Inspiration"}
              </p>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white/55 backdrop-blur-sm transition hover:text-red-400"
        aria-label="Retirer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GenericRow({
  fav,
  onRemove,
}: {
  fav: PlanifierFavorite;
  onRemove: () => void;
}) {
  const Icon = KIND_META[fav.kind].icon;
  const href =
    fav.kind === "map_region"
      ? `/inspirer?region=${fav.refId}`
      : fav.kind === "star_itinerary"
        ? `/inspirer?tab=stars`
        : undefined;

  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 p-3 transition hover:border-white/14 hover:bg-white/5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-start)]/15">
        <Icon className="h-4 w-4 text-[var(--color-accent-start)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-title truncate text-sm font-bold text-white/85">
          {fav.label}
        </p>
        <p className="font-courier text-[10px] text-white/35">
          {KIND_META[fav.kind].label} · {fav.status}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-full p-1.5 text-white/25 transition hover:text-red-400"
        aria-label="Retirer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
