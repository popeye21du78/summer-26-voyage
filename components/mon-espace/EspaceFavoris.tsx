"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Star, Trash2 } from "lucide-react";
import { listFavorites, removeFavorite, type PlanifierFavorite } from "@/lib/planifier-favorites";

export default function EspaceFavoris() {
  const [favorites, setFavorites] = useState<PlanifierFavorite[]>([]);

  useEffect(() => {
    setFavorites(listFavorites());
  }, []);

  function handleRemove(id: string) {
    removeFavorite(id);
    setFavorites(listFavorites());
  }

  const kindIcon: Record<string, typeof Heart> = {
    territory: MapPin,
    place: MapPin,
    star_itinerary: Star,
    map_region: MapPin,
    route_idea: Star,
  };

  return (
    <section className="px-5 py-6">
      <h2 className="mb-4 flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
        <Heart className="h-4 w-4" />
        Coups de cœur & repères
      </h2>

      {favorites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/8 py-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-[var(--color-accent-start)]/20" />
          <p className="mt-2 font-courier text-xs text-white/35">
            Tes repères sauvegardés depuis S&apos;inspirer apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => {
            const Icon = kindIcon[fav.kind] ?? Heart;
            return (
              <div
                key={fav.id}
                className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-start)]/15">
                  <Icon className="h-4 w-4 text-[var(--color-accent-start)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-courier text-xs font-bold text-white/80">
                    {fav.label}
                  </p>
                  <p className="font-courier text-[10px] text-white/30">
                    {fav.kind.replace(/_/g, " ")} · {fav.status}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(fav.id)}
                  className="text-red-400/30 transition hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
