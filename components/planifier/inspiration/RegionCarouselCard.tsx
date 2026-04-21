"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cacheKeysCarouselCard } from "@/lib/client-photo-cache";
import { useRegionCardResolvedPhoto } from "@/hooks/useRegionCardResolvedPhoto";
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
  const { src } = useRegionCardResolvedPhoto({ id: r.id, headerPhoto: r.headerPhoto });
  const [pool, setPool] = useState<string[]>([]);
  const [manualSrc, setManualSrc] = useState<string | null>(null);
  const [imgReady, setImgReady] = useState(false);

  const displaySrc = manualSrc ?? src ?? "";
  const showPhoto = displaySrc.length > 0;

  useEffect(() => {
    setManualSrc(null);
  }, [r.id]);

  useEffect(() => {
    setImgReady(false);
  }, [displaySrc]);

  useEffect(() => {
    fetch(`/api/inspiration/curated-pool?regionId=${encodeURIComponent(r.id)}`)
      .then((res) => res.json())
      .then((d: { urls?: string[] }) => setPool(Array.isArray(d.urls) ? d.urls : []))
      .catch(() => setPool([]));
  }, [r.id]);

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
          ? "border-[var(--color-accent-start)] ring-2 ring-[var(--color-accent-start)]/40 shadow-[0_0_20px_rgba(224,120,86,0.2)]"
          : "border-white/8 hover:border-[var(--color-accent-start)]/30 shadow-lg shadow-black/20"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-bg-main)]">
        {!showPhoto && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[var(--color-bg-main)]">
            <Image
              src="/A1.png"
              alt=""
              width={48}
              height={48}
              className="opacity-30"
              style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }}
            />
          </div>
        )}
        {showPhoto && (
          <>
            {!imgReady && (
              <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[var(--color-bg-main)]">
                <Image
                  src="/A1.png"
                  alt=""
                  width={48}
                  height={48}
                  className="opacity-30"
                  style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }}
                />
              </div>
            )}
            <Image
              src={displaySrc}
              alt=""
              fill
              sizes="140px"
              className={`photo-bw-reveal object-cover transition-opacity duration-200 ${imgReady ? "opacity-100" : "opacity-0"}`}
              onLoadingComplete={() => setImgReady(true)}
            />
          </>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/30" />
        <div className="pointer-events-none absolute inset-0 z-[38] flex flex-col items-center justify-center px-2 text-center">
          <span className="line-clamp-2 font-courier text-[11px] font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {r.name}
          </span>
          <p className="mt-1 line-clamp-2 font-courier text-[9px] leading-snug text-white/65">
            {r.accroche_carte}
          </p>
        </div>
        {showPhoto && (
        <PhotoCurationOverlay
          slug={`carousel-card:${r.id}`}
          imageUrl={displaySrc}
          title={r.name}
          compact
          photoLookupStepId={r.id}
          sessionPhotoCacheKey={cacheKeysCarouselCard(r.id)}
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
            const idx = Math.max(0, list.findIndex((u) => u === displaySrc));
            setManualSrc(list[(idx + 1) % list.length]!);
          }}
        />
        )}
      </div>
      <span className="absolute right-1.5 top-1.5 z-[42]" onClick={(e) => e.stopPropagation()}>
        <FavoriteButton kind="map_region" refId={r.id} label={r.name} />
      </span>
    </div>
  );
}
