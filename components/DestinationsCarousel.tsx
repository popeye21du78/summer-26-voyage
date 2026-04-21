"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface VoyagePrefait {
  id: string;
  titre: string;
  sousTitre: string;
  dureeJours: number;
  steps: Array<{
    nom: string;
    contenu_voyage?: { photos?: string[] };
  }>;
}

type Props = {
  voyages: VoyagePrefait[];
};

export default function DestinationsCarousel({ voyages }: Props) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [snapTimeout, setSnapTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const cardWidth = 340;
  const gap = 24;
  const slideWidth = cardWidth + gap;
  const minOffset = -(voyages.length - 1) * slideWidth;
  const maxOffset = 0;

  const currentIndex = Math.round(-offset / slideWidth);
  const normalizedIndex = Math.max(0, Math.min(voyages.length - 1, currentIndex));

  const snapToNearest = () => {
    const nearestIndex = Math.round(-offset / slideWidth);
    const clampedIndex = Math.max(0, Math.min(voyages.length - 1, nearestIndex));
    const targetOffset = -clampedIndex * slideWidth;
    setOffset(targetOffset);
    setCurrentOffset(targetOffset);
  };

  const nextSlide = () => {
    if (normalizedIndex >= voyages.length - 1) return;
    const newOffset = offset - slideWidth;
    setOffset(newOffset);
    setCurrentOffset(newOffset);
  };

  const prevSlide = () => {
    if (normalizedIndex <= 0) return;
    const newOffset = offset + slideWidth;
    setOffset(newOffset);
    setCurrentOffset(newOffset);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaX || e.deltaY;
    const newOffset = Math.max(minOffset, Math.min(maxOffset, offset - delta * 0.3));
    setOffset(newOffset);
    setCurrentOffset(newOffset);
    if (snapTimeout) clearTimeout(snapTimeout);
    setSnapTimeout(setTimeout(snapToNearest, 150));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentOffset(offset);
    if (snapTimeout) clearTimeout(snapTimeout);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const newOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset + deltaX));
    setOffset(newOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    snapToNearest();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentOffset(offset);
    if (snapTimeout) clearTimeout(snapTimeout);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;
    const newOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset + deltaX));
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    snapToNearest();
  };

  if (voyages.length === 0) return null;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={prevSlide}
        disabled={normalizedIndex <= 0}
        className={`absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl font-bold text-white shadow-2xl transition-all duration-300 md:h-14 md:w-14 ${
          normalizedIndex <= 0
            ? "cursor-not-allowed bg-[#8B4513]/30 opacity-50"
            : "cursor-pointer bg-[var(--color-accent-start)] hover:scale-110 hover:bg-[var(--color-accent-mid)] hover:shadow-[var(--color-accent-start)]/70 active:scale-95"
        }`}
      >
        ‹
      </button>

      <div
        className="relative overflow-hidden px-14 py-4 md:px-20"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative flex h-[420px] items-center justify-center">
          {voyages.map((v, index) => {
            const position = index * slideWidth;
            const translateX = position + offset;
            const isCenter = index === normalizedIndex;
            const firstPhoto = v.steps[0]?.contenu_voyage?.photos?.[0];
            const villes = v.steps.slice(0, 2).map((s) => s.nom).join(" · ");

            return (
              <div
                key={v.id}
                className="absolute transition-transform duration-500"
                style={{
                  transform: `translateX(calc(50% + ${translateX}px)) translateX(-50%) scale(${isCenter ? 1.05 : 0.9})`,
                  opacity: isCenter ? 1 : 0.6,
                  width: `${cardWidth}px`,
                }}
              >
                <Link
                  href="/prevoyages"
                  className="group block overflow-hidden rounded-[24px] border-4 shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    borderColor: isCenter ? "var(--color-accent-start)" : "rgba(255, 255, 255, 0.5)",
                    boxShadow: isCenter ? "0 30px 60px -15px rgba(224, 120, 86, 0.5)" : undefined,
                  }}
                >
                  <div className="relative h-[320px] w-full">
                    <Image
                      src={
                        firstPhoto ||
                        "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800"
                      }
                      alt={v.titre}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="340px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                      <p className="font-courier text-xl font-bold text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
                        {v.titre}
                      </p>
                      <p className="mt-2 font-courier text-sm text-[var(--color-accent-start)]">{v.sousTitre}</p>
                      <p className="mt-1 font-courier text-xs text-white/90">
                        {v.dureeJours}j · {villes}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={nextSlide}
        disabled={normalizedIndex >= voyages.length - 1}
        className={`absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl font-bold text-white shadow-2xl transition-all duration-300 md:h-14 md:w-14 ${
          normalizedIndex >= voyages.length - 1
            ? "cursor-not-allowed bg-[#8B4513]/30 opacity-50"
            : "cursor-pointer bg-[var(--color-accent-start)] hover:scale-110 hover:bg-[var(--color-accent-mid)] hover:shadow-[var(--color-accent-start)]/70 active:scale-95"
        }`}
      >
        ›
      </button>

      <div className="mt-4 flex justify-center gap-2">
        {voyages.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              const targetOffset = -index * slideWidth;
              setOffset(targetOffset);
              setCurrentOffset(targetOffset);
            }}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === normalizedIndex
                ? "w-8 bg-[var(--color-accent-start)]"
                : "w-2 bg-[#8B4513]/30 hover:bg-[#8B4513]/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
