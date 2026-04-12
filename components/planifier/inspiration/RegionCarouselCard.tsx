"use client";

import Image from "next/image";
import { useCuratedAssignmentPhoto } from "@/hooks/useCuratedInspirationPhotos";
import type { RegionEditorialContent } from "@/types/inspiration";
import FavoriteButton from "./FavoriteButton";

export default function RegionCarouselCard({
  r,
  active,
  onPick,
}: {
  r: RegionEditorialContent;
  active: boolean;
  onPick: (id: string) => void;
}) {
  const curated = useCuratedAssignmentPhoto(`carousel-card:${r.id}`, r.id);
  const src = curated ?? r.headerPhoto;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPick(r.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(r.id);
        }
      }}
      className={`group relative flex w-[148px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition ${
        active
          ? "border-[#E07856] ring-2 ring-[#E07856]/35"
          : "border-[#A55734]/15 hover:border-[#E07856]/50"
      }`}
    >
      <div className="relative aspect-[4/3] w-full bg-[#e8dfd6]">
        <Image src={src} alt="" fill sizes="148px" className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <span className="line-clamp-2 font-courier text-[11px] font-bold leading-tight text-[#333]">
          {r.name}
        </span>
        <p className="line-clamp-2 font-courier text-[10px] leading-snug text-[#333]/75">
          {r.accroche_carte}
        </p>
      </div>
      <span className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
        <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
      </span>
    </div>
  );
}
