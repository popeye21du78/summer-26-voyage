"use client";

import Image from "next/image";
import { useMemo } from "react";
import { listRegionEditorials } from "@/content/inspiration/regions";
import { useInspirationMap } from "@/lib/inspiration-map-context";
import FavoriteButton from "./FavoriteButton";

export default function RegionCarousel() {
  const { searchQuery, selectRegion, top } = useInspirationMap();

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
    top.screen !== "france" && "regionId" in top ? top.regionId : null;

  return (
    <div className="shrink-0 border-t border-[#A55734]/10 bg-[#FFF8F0]/95 py-3 backdrop-blur-sm">
      <p className="mb-2 px-4 font-courier text-[10px] font-bold uppercase tracking-wide text-[#A55734]/80">
        Régions
      </p>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-thin">
        {regions.map((r) => (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => selectRegion(r.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectRegion(r.id);
              }
            }}
            className={`group relative flex w-[148px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition ${
              activeId === r.id
                ? "border-[#E07856] ring-2 ring-[#E07856]/35"
                : "border-[#A55734]/15 hover:border-[#E07856]/50"
            }`}
          >
            <div className="relative aspect-[4/3] w-full bg-[#e8dfd6]">
              <Image
                src={r.headerPhoto}
                alt=""
                fill
                sizes="148px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-2.5">
              <span className="line-clamp-2 font-courier text-[11px] font-bold leading-tight text-[#333]">
                {r.name}
              </span>
              <p className="line-clamp-2 font-courier text-[10px] leading-snug text-[#333]/75">
                {r.accroche_carte}
              </p>
            </div>
            <span
              className="absolute right-2 top-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
