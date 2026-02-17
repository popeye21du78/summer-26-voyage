"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";

const VAN_DURATION_S = 1;
const COLOR_DELAY_MS = 1000; // 1 s en N&B avant de commencer la coloration
const COLOR_DURATION_MS = 2000; // 2 s pour faire progresser la couleur de 0 à 100 %
const COLOR_STEP_MS = 40; // mise à jour toutes les 40 ms (~25 fps)

type VanPhotoBlockProps = {
  photoSansVan: string;
  photoAvecVan: string;
  vanPng: string;
  alt: string;
  onAnimationDone?: () => void;
  isCurrentSlide?: boolean;
};

export default function VanPhotoBlock({
  photoSansVan,
  onAnimationDone,
  isCurrentSlide = false,
}: VanPhotoBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const colorTickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const [colorProgress, setColorProgress] = useState(0); // 0 = N&B, 1 = couleur légère

  useEffect(() => {
    if (!isInView || phase !== "idle") return;
    const t = setTimeout(() => {
      setPhase("done");
      onAnimationDone?.();
    }, VAN_DURATION_S * 1000);
    return () => clearTimeout(t);
  }, [isInView, phase, onAnimationDone]);

  useEffect(() => {
    if (!isCurrentSlide) {
      setColorProgress(0);
      if (colorTickRef.current) {
        clearTimeout(colorTickRef.current);
        colorTickRef.current = null;
      }
      return;
    }
    const startDelay = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(1, elapsed / COLOR_DURATION_MS);
        setColorProgress(progress);
        if (progress < 1) colorTickRef.current = setTimeout(tick, COLOR_STEP_MS);
      };
      tick();
    }, COLOR_DELAY_MS);
    return () => {
      clearTimeout(startDelay);
      if (colorTickRef.current) clearTimeout(colorTickRef.current);
    };
  }, [isCurrentSlide]);

  const filter =
    !isCurrentSlide || colorProgress <= 0
      ? "grayscale(100%)"
      : `grayscale(${(1 - colorProgress) * 100}%) saturate(${colorProgress * 0.35})`;

  return (
    <div ref={ref} className="relative h-screen w-full overflow-hidden">
      {/* Photo sans van : N&B ; 1 s puis couleur qui monte progressivement sur 2 s */}
      <div className="absolute inset-0" style={{ filter }}>
        <Image
          src={photoSansVan}
          alt=""
          fill
          className="object-cover object-left-bottom"
          sizes="100vw"
          unoptimized
          aria-hidden
        />
      </div>
    </div>
  );
}
