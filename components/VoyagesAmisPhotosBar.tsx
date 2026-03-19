"use client";

import Link from "next/link";
import Image from "next/image";

export interface VoyageAmiPhoto {
  url: string;
  voyageId: string;
  voyageTitre: string;
  profileName: string;
  ville?: string;
}

type Props = {
  items: VoyageAmiPhoto[];
};

export default function VoyagesAmisPhotosBar({ items }: Props) {
  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="relative -mx-4 overflow-hidden py-4">
      <div className="flex animate-scroll-horizontal-slow gap-3">
        {doubled.map((item, i) => (
          <Link
            key={`${item.voyageId}-${i}`}
            href={`/voyage/${item.voyageId}/prevu`}
            className="group relative h-32 w-44 shrink-0 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg transition-all hover:scale-105 hover:border-[var(--terracotta-light)] hover:shadow-xl"
          >
            <Image
              src={item.url}
              alt={item.ville ?? item.voyageTitre}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="176px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="truncate text-xs font-medium text-white drop-shadow-md">
                {item.profileName}
              </p>
              <p className="truncate text-[10px] text-white/90">
                {item.voyageTitre}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
