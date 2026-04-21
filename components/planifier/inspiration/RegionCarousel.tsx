"use client";

import { useMemo } from "react";
import { listRegionEditorials } from "@/content/inspiration/regions";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import RegionCarouselCard from "./RegionCarouselCard";

type Props = {
  onPickRegion?: (id: string) => void;
  highlightRegionId?: string | null;
};

export default function RegionCarousel({ onPickRegion, highlightRegionId }: Props = {}) {
  const { searchQuery, selectRegion, top } = useInspirationMap();
  const pick = onPickRegion ?? selectRegion;

  const regions = useMemo(() => {
    const all = listRegionEditorials();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.shortDescription.toLowerCase().includes(q) ||
        r.accroche_carte.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeId =
    highlightRegionId ??
    (top.screen !== "france" && "regionId" in top ? top.regionId : null);

  return (
    <div className="shrink-0 border-t border-white/6 bg-[var(--color-bg-main)]/95 py-3 backdrop-blur-lg">
      <p className="mb-2 px-4 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
        Régions
      </p>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {regions.map((r) => (
          <RegionCarouselCard
            key={r.id}
            r={r}
            active={activeId === r.id}
            onPick={pick}
          />
        ))}
      </div>
    </div>
  );
}
