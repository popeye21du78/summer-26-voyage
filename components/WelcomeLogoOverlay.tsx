"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const LOGO_SRC = "/logo-1.png"; // ou /logo-a-page-daccueil.png si tu ajoutes ce fichier dans public

type Props = { show: boolean };

export default function WelcomeLogoOverlay({ show }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [slideOut, setSlideOut] = useState(false);

  useEffect(() => {
    if (!show) return;

    setVisible(true);
    setSlideOut(false);

    const startSlide = setTimeout(() => {
      setSlideOut(true);
    }, 1000);

    const removeAndClean = setTimeout(() => {
      setVisible(false);
      router.replace("/accueil");
    }, 1000 + 400); // 1s affichage + 400ms animation

    return () => {
      clearTimeout(startSlide);
      clearTimeout(removeAndClean);
    };
  }, [show, router]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FAF4F0] transition-transform duration-[400ms] ease-in-out"
      style={{ transform: slideOut ? "translateX(100%)" : "translateX(0)" }}
      aria-hidden
    >
      <div className="relative h-full w-full">
        <Image
          src={LOGO_SRC}
          alt=""
          fill
          className="object-contain object-center p-8"
          priority
          unoptimized
          sizes="100vw"
        />
      </div>
    </div>
  );
}
