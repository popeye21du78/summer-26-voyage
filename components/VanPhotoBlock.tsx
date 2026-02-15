"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";

const VAN_DURATION_S = 1;

type VanPhotoBlockProps = {
  photoSansVan: string;
  photoAvecVan: string;
  vanPng: string;
  alt: string;
  onAnimationDone?: () => void;
};

export default function VanPhotoBlock({
  photoSansVan,
  onAnimationDone,
}: VanPhotoBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [phase, setPhase] = useState<"idle" | "done">("idle");

  useEffect(() => {
    if (!isInView || phase !== "idle") return;
    const t = setTimeout(() => {
      setPhase("done");
      onAnimationDone?.();
    }, VAN_DURATION_S * 1000);
    return () => clearTimeout(t);
  }, [isInView, phase, onAnimationDone]);

  return (
    <div ref={ref} className="relative h-screen w-full overflow-hidden">
      {/* Photo sans van : défile avec le scroll ; reste visible (ne disparaît pas après consultation) */}
      <div className="absolute inset-0">
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
