"use client";

import { useState } from "react";

const PHILOSOPHIES = [
  {
    title: "LIBERTÉ",
    description:
      "Voyager à son rythme, s'arrêter où bon vous semble et vivre au fil de vos envies.",
    color: "#E07856",
  },
  {
    title: "AUTHENTICITÉ",
    description:
      "Découvrir la vraie France, loin des circuits touristiques classiques.",
    color: "#D4635B",
  },
  {
    title: "ÉCORESPONSABILITÉ",
    description:
      "Voyager en respectant l'environnement et les communautés locales.",
    color: "#C9785D",
  },
  {
    title: "PARTAGE",
    description:
      "Créer des souvenirs inoubliables et partager des moments uniques en famille ou entre amis.",
    color: "#E07856",
  },
  {
    title: "AVENTURE",
    description:
      "Sortir des sentiers battus et explorer l'inconnu avec curiosité et passion.",
    color: "#D4635B",
  },
  {
    title: "SIMPLICITÉ",
    description:
      "Vivre l'essentiel, se reconnecter à la nature et redécouvrir les plaisirs simples.",
    color: "#C9785D",
  },
];

export default function PhilosophieCylindre() {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [snapTimeout, setSnapTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const anglePerSlide = 360 / PHILOSOPHIES.length;
  const currentIndex = Math.round((-rotation / anglePerSlide)) % PHILOSOPHIES.length;
  const normalizedIndex =
    currentIndex < 0 ? currentIndex + PHILOSOPHIES.length : currentIndex;

  const snapToNearest = () => {
    const nearestIndex = Math.round(-rotation / anglePerSlide);
    const targetRotation = -nearestIndex * anglePerSlide;
    setRotation(targetRotation);
    setCurrentRotation(targetRotation);
  };

  const nextSlide = () => {
    setRotation((prev) => prev - anglePerSlide);
    setCurrentRotation((r) => r - anglePerSlide);
  };

  const prevSlide = () => {
    setRotation((prev) => prev + anglePerSlide);
    setCurrentRotation((r) => r + anglePerSlide);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaX || e.deltaY;
    setRotation((prev) => prev - delta * 0.3);
    setCurrentRotation((prev) => prev - delta * 0.3);
    if (snapTimeout) clearTimeout(snapTimeout);
    const timeout = setTimeout(snapToNearest, 150);
    setSnapTimeout(timeout);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentRotation(rotation);
    if (snapTimeout) clearTimeout(snapTimeout);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    setRotation(currentRotation + deltaX * 0.5);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    snapToNearest();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentRotation(rotation);
    if (snapTimeout) clearTimeout(snapTimeout);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;
    setRotation(currentRotation + deltaX * 0.5);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    snapToNearest();
  };

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-2 md:gap-4">
      <button
        type="button"
        onClick={prevSlide}
        className="z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E07856] text-2xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#D4635B] hover:shadow-[#E07856]/70 active:scale-95 md:h-14 md:w-14"
      >
        ‹
      </button>

      <div
        className="relative w-[400px] cursor-grab select-none md:w-[500px] active:cursor-grabbing"
        style={{ perspective: "2000px", perspectiveOrigin: "center center" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative flex h-[260px] w-full items-center justify-center"
          style={{ transformStyle: "preserve-3d", transformOrigin: "50% 50% 0" }}
        >
          {PHILOSOPHIES.map((philosophy, index) => {
            const angle = index * anglePerSlide;
            const rotateY = angle + rotation;
            const isCenter = index === normalizedIndex;
            const radius = 380;

            return (
              <div
                key={index}
                className="absolute"
                style={{
                  transform: `rotateY(${rotateY}deg) translateZ(${radius}px)`,
                  transformStyle: "preserve-3d",
                  transition: isDragging
                    ? "none"
                    : "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  width: "260px",
                  maxWidth: "75vw",
                }}
              >
                <div
                  className="flex flex-col rounded-[24px] border-2 bg-white/5 p-5 backdrop-blur-md"
                  style={{
                    borderColor: isCenter ? "#E07856" : "rgba(255, 255, 255, 0.2)",
                    boxShadow: isCenter
                      ? "0 25px 50px -12px rgba(224, 120, 86, 0.5)"
                      : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    opacity: isCenter ? 1 : 0.5,
                    transform: `scale(${isCenter ? 1.1 : 0.9})`,
                    transition: isDragging
                      ? "none"
                      : "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    pointerEvents: "none",
                    height: "220px",
                  }}
                >
                  <p
                    className="mb-2 font-courier text-base font-bold tracking-wider"
                    style={{ color: philosophy.color }}
                  >
                    {philosophy.title}
                  </p>
                  <p className="line-clamp-3 font-courier text-sm leading-relaxed text-white/90">
                    {philosophy.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={nextSlide}
        className="z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E07856] text-2xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#D4635B] hover:shadow-[#E07856]/70 active:scale-95 md:h-14 md:w-14"
      >
        ›
      </button>
      </div>

      <div className="mt-6 flex w-full justify-center gap-3">
        {PHILOSOPHIES.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              const targetRotation = -index * anglePerSlide;
              setRotation(targetRotation);
              setCurrentRotation(targetRotation);
            }}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === normalizedIndex
                ? "w-8 bg-[#E07856]"
                : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
