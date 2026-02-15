"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import VanPhotoBlock from "./VanPhotoBlock";

// Nom exact du fichier dans public/ (espace avant .PNG si tu l’as enregistré ainsi)
const VAN_PNG = "/van1.png";

const SLIDES = [
  {
    photoSansVan: "/photo-rocamadour-sans-van-couleur.png",
    photoAvecVan: "/photo-rocamadour-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Rocamadour",
  },
  {
    photoSansVan: "/photo-marseille-sans-van-couleur.png",
    photoAvecVan: "/photo-marseille-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Marseille",
  },
  {
    photoSansVan: "/photo-montagne-sans-van-couleur.png",
    photoAvecVan: "/photo-montagne-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Montagne",
  },
] as const;

const TOLERANCE_PX = 40; // seuil pour considérer qu'on est sur le premier / dernier slide
const SCROLL_COOLDOWN_MS = 400; // évite les conflits pendant le scroll fluide

export default function QuiEtesVousScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollCooldownRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [slideHeight, setSlideHeight] = useState(0);
  const [doneSlides, setDoneSlides] = useState<boolean[]>([false, false, false]);

  const setSlideDone = useCallback((index: number) => {
    setDoneSlides((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  const [sectionFullyInView, setSectionFullyInView] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSectionFullyInView(entry.isIntersecting && entry.intersectionRatio >= 1),
      { threshold: 1 }
    );
    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      setScrollTop(scrollEl.scrollTop);
      if (slideHeight === 0 && scrollEl.clientHeight) setSlideHeight(scrollEl.clientHeight);
    };
    onScroll();
    scrollEl.addEventListener("scroll", onScroll);
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [slideHeight]);

  useEffect(() => {
    const section = sectionRef.current;
    const scrollEl = scrollRef.current;
    if (!section || !scrollEl) return;

    const startCooldown = () => {
      scrollCooldownRef.current = true;
      setTimeout(() => {
        scrollCooldownRef.current = false;
      }, SCROLL_COOLDOWN_MS);
    };

    const handleWheel = (e: WheelEvent) => {
      if (scrollCooldownRef.current) return;

      const rect = section.getBoundingClientRect();
      const fullyInView = rect.top <= 0 && rect.bottom >= window.innerHeight;
      const anyPartVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      const seeTopOfSection = rect.top < window.innerHeight;
      const seeBottomOfSection = rect.bottom > 0;

      // Dès qu'on voit un peu la section, on y est emmenés délicatement
      if (!fullyInView && anyPartVisible) {
        if (e.deltaY > 0 && seeTopOfSection && rect.top > 0) {
          e.preventDefault();
          section.scrollIntoView({ behavior: "smooth", block: "start" });
          startCooldown();
          return;
        }
        if (e.deltaY < 0 && seeBottomOfSection && rect.bottom < window.innerHeight) {
          e.preventDefault();
          section.scrollIntoView({ behavior: "smooth", block: "end" });
          startCooldown();
          return;
        }
        return;
      }

      if (!fullyInView) return;

      const { scrollTop: st, scrollHeight, clientHeight } = scrollEl;
      const slideH = clientHeight;
      const currentIdx = Math.round(st / slideH);
      const atTop = st <= TOLERANCE_PX;
      const atBottom = st >= scrollHeight - slideH - TOLERANCE_PX;

      // Cibles en indices de slide pour un scroll toujours fluide
      const targetIdxUp = Math.max(0, currentIdx - 1);
      const targetIdxDown = Math.min(SLIDES.length - 1, currentIdx + 1);

      // Molette vers le haut : quitter la section (premier slide) ou slide au-dessus
      if (e.deltaY < 0) {
        e.preventDefault();
        if (atTop) {
          const prev = section.previousElementSibling as HTMLElement | null;
          if (prev) prev.scrollIntoView({ behavior: "smooth", block: "end" });
          else window.scrollTo({ top: Math.max(0, section.offsetTop - 1), behavior: "smooth" });
        } else {
          scrollEl.scrollTo({ top: targetIdxUp * slideH, behavior: "smooth" });
        }
        startCooldown();
        return;
      }

      // Molette vers le bas : slide en dessous ou quitter vers la fin (dernier slide)
      if (e.deltaY > 0) {
        e.preventDefault();
        if (atBottom) {
          const next = section.nextElementSibling as HTMLElement | null;
          if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
          else window.scrollTo({ top: section.offsetTop + section.offsetHeight, behavior: "smooth" });
        } else {
          scrollEl.scrollTo({ top: targetIdxDown * slideH, behavior: "smooth" });
        }
        startCooldown();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const currentIndex = slideHeight > 0 ? Math.round(scrollTop / slideHeight) : 0;
  const clampedIndex = Math.max(0, Math.min(currentIndex, SLIDES.length - 1));
  const showFixedAvecVan = sectionFullyInView && doneSlides[clampedIndex];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="qui-vous-heading"
      className="relative h-screen w-full overflow-hidden"
    >
      <h2 id="qui-vous-heading" className="sr-only">
        Qui êtes vous
      </h2>
      <div
        ref={scrollRef}
        className="relative z-0 h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {SLIDES.map((slide, i) => (
          <div key={i} className="h-screen w-full shrink-0 snap-start" style={{ scrollSnapStop: "always" }}>
            <VanPhotoBlock
              photoSansVan={slide.photoSansVan}
              photoAvecVan={slide.photoAvecVan}
              vanPng={slide.vanPng}
              alt={slide.alt}
              onAnimationDone={() => setSlideDone(i)}
            />
          </div>
        ))}
      </div>
      {/* Calques fixes rendus en portail au-dessus de toute la page (van toujours visible au-dessus des photos) */}
      {typeof document !== "undefined" &&
        sectionFullyInView &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden>
            {showFixedAvecVan && (
              <div className="absolute inset-0">
                <Image
                  src={SLIDES[clampedIndex].photoAvecVan}
                  alt=""
                  fill
                  className="object-cover object-left-bottom"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            )}
            {/* Van au premier plan : <img> natif pour éviter tout souci avec next/image dans le portail */}
            <div className="absolute inset-0">
              <img
                src={VAN_PNG}
                alt=""
                className="h-full w-full object-cover object-left-bottom"
                loading="eager"
              />
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
