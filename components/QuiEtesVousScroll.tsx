"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import VanPhotoBlock from "./VanPhotoBlock";

const VAN_PNG = "/van1.png";
const ORANGE_RGB = "rgb(165, 53, 0)";
const PREMIER_V = "/premier-v.png";
const DEUXIEME_V = "/deuxieme-v.png";
const VAN_ZONE_LEFT_PCT = 38;
const VAN_ZONE_BOTTOM_PCT = 42;

type TitlePart = string | "V1" | "V2";

const SLIDES: Array<{
  photoSansVan: string;
  photoAvecVan: string;
  vanPng: string;
  alt: string;
  titleLine1: TitlePart[];
  titleLine2: TitlePart[];
  body: string;
}> = [
  {
    photoSansVan: "/photo-rocamadour-sans-van-couleur.png",
    photoAvecVan: "/photo-rocamadour-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Rocamadour",
    titleLine1: ["de ", "V1", "illage en"],
    titleLine2: ["", "V2", "illage"],
    body: "Que tu veuilles partir à la découverte des plus beaux recoins de France…",
  },
  {
    photoSansVan: "/photo-marseille-sans-van-couleur.png",
    photoAvecVan: "/photo-marseille-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Marseille",
    titleLine1: ["de ", "V1", "ille en"],
    titleLine2: ["", "V2", "ille"],
    body: "ou des métropoles les plus emblématiques du sud,",
  },
  {
    photoSansVan: "/photo-montagne-sans-van-couleur.png",
    photoAvecVan: "/photo-montagne-avec-van-couleur.png",
    vanPng: VAN_PNG,
    alt: "Montagne",
    titleLine1: ["", "V1", "aille que"],
    titleLine2: ["", "V2", "aille"],
    body: "ou que tu préfères les randonnées dans la nature, ton sac sur le dos et tes ampoules aux pieds.",
  },
];

export default function QuiEtesVousScroll() {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = entry.target.getAttribute("data-slide-index");
          if (index === null) continue;
          const i = parseInt(index, 10);
          const isActive = entry.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.9;
          if (isActive) {
            entry.target.classList.add("is-active");
            setActiveSlideIndex(i);
          } else {
            entry.target.classList.remove("is-active");
            setActiveSlideIndex((prev) => (prev === i ? null : prev));
          }
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.9 }
    );
    slideRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          ref={(el) => {
            slideRefs.current[i] = el;
          }}
          data-slide-index={i}
          aria-labelledby={i === 0 ? "qui-vous-heading" : undefined}
          className="slide group relative h-[100dvh] w-full shrink-0 flex-none snap-start snap-always"
        >
          {i === 0 && (
            <h2 id="qui-vous-heading" className="sr-only">
              Qui êtes vous
            </h2>
          )}
          <div className="h-full w-full overflow-hidden">
            <VanPhotoBlock
              photoSansVan={slide.photoSansVan}
              photoAvecVan={slide.photoAvecVan}
              vanPng={slide.vanPng}
              alt={slide.alt}
              onAnimationDone={() => {}}
              isCurrentSlide={activeSlideIndex === i}
            />
          </div>

            {/* Overlays : visibles uniquement quand .is-active (IntersectionObserver) */}
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-center px-6 opacity-0 transition-opacity duration-500 md:px-12 group-[.is-active]:opacity-100"
              aria-hidden
            >
              <div
                className="absolute inset-0 -z-10"
                style={{ background: "rgba(0,0,0,0.55)" }}
              />
              <h3
                className="font-mono mb-4 w-full text-center text-3xl font-bold tracking-wide md:text-4xl lg:text-5xl"
                style={{ color: ORANGE_RGB }}
              >
                {slide.titleLine1.map((part, j) =>
                  part === "V1" ? (
                    <Image
                      key={`a-${j}`}
                      src={PREMIER_V}
                      alt=""
                      width={40}
                      height={40}
                      className="inline-block h-[1.1em] w-auto align-middle"
                      unoptimized
                    />
                  ) : part === "V2" ? (
                    <Image
                      key={`a-${j}`}
                      src={DEUXIEME_V}
                      alt=""
                      width={40}
                      height={40}
                      className="inline-block h-[1.1em] w-auto align-middle"
                      unoptimized
                    />
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
                <br />
                {slide.titleLine2.map((part, j) =>
                  part === "V1" ? (
                    <Image
                      key={`b-${j}`}
                      src={PREMIER_V}
                      alt=""
                      width={40}
                      height={40}
                      className="inline-block h-[1.1em] w-auto align-middle"
                      unoptimized
                    />
                  ) : part === "V2" ? (
                    <Image
                      key={`b-${j}`}
                      src={DEUXIEME_V}
                      alt=""
                      width={40}
                      height={40}
                      className="inline-block h-[1.1em] w-auto align-middle"
                      unoptimized
                    />
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </h3>
              <p
                className="font-mono text-sm font-normal leading-relaxed text-white opacity-0 transition-opacity duration-700 delay-[1500ms] md:text-base group-[.is-active]:opacity-100"
                style={{
                  marginLeft: `${VAN_ZONE_LEFT_PCT}%`,
                  marginBottom: `${VAN_ZONE_BOTTOM_PCT}%`,
                  maxWidth: `${100 - VAN_ZONE_LEFT_PCT - 8}%`,
                  textAlign: "right",
                }}
              >
                {slide.body}
              </p>
            </div>

            {/* Van1.png : visible quand .is-active */}
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-[.is-active]:opacity-100"
              aria-hidden
            >
              <img
                src={VAN_PNG}
                alt=""
                className="h-full w-full object-cover object-left-bottom"
                loading="eager"
              />
          </div>
        </div>
      ))}
    </>
  );
}
