"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCuratedAssignmentPhoto } from "@/hooks/useCuratedInspirationPhotos";
import type { RegionEditorialContent } from "@/types/inspiration";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";
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
  const [pool, setPool] = useState<string[]>([]);
  const [manualSrc, setManualSrc] = useState<string | null>(null);

  useEffect(() => {
    setManualSrc(null);
  }, [r.id]);

  useEffect(() => {
    fetch(`/api/inspiration/curated-pool?regionId=${encodeURIComponent(r.id)}`)
      .then((res) => res.json())
      .then((d: { urls?: string[] }) => setPool(Array.isArray(d.urls) ? d.urls : []))
      .catch(() => setPool([]));
  }, [r.id]);

  const base = curated ?? r.headerPhoto;
  const src = manualSrc ?? base;

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
      className={`group relative flex w-[140px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition ${
        active
          ? "border-[#E07856] ring-2 ring-[#E07856]/40 shadow-[0_0_20px_rgba(224,120,86,0.2)]"
          : "border-white/8 hover:border-[#E07856]/30 shadow-lg shadow-black/20"
      }`}
    >
      <div className="relative aspect-[3/4] w-full bg-[#1c1c1c] overflow-hidden">
        <Image
          src={src}
          alt=""
          fill
          sizes="140px"
          className="photo-bw-reveal object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <PhotoCurationOverlay
          slug={`carousel-card:${r.id}`}
          imageUrl={src}
          title={r.name}
          compact
          onOther={() => {
            const list = pool.length > 0 ? pool : [r.headerPhoto];
            if (list.length <= 1) {
              fetch(
                `/api/photo-ville?stepId=${encodeURIComponent(`carousel-${r.id}`)}&ville=${encodeURIComponent(r.name)}&slug=${encodeURIComponent(r.id)}&refresh=1`
              )
                .then((res) => (res.ok ? res.json() : null))
                .then((d: { url?: string }) => {
                  if (d?.url) setManualSrc(d.url);
                })
                .catch(() => {});
              return;
            }
            const idx = Math.max(0, list.findIndex((u) => u === src));
            setManualSrc(list[(idx + 1) % list.length]!);
          }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="line-clamp-2 font-courier text-[11px] font-bold leading-tight text-white drop-shadow-lg">
          {r.name}
        </span>
        <p className="mt-0.5 line-clamp-1 font-courier text-[9px] leading-snug text-white/50">
          {r.accroche_carte}
        </p>
      </div>
      <span className="absolute right-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
        <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
      </span>
    </div>
  );
}
