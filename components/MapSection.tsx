"use client";

import dynamic from "next/dynamic";

const MapboxMap = dynamic(() => import("./MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[70vh] w-full items-center justify-center bg-[#FFFFFF]">
      <p className="text-[#333333]">Chargement de la carte…</p>
    </div>
  ),
});

export default function MapSection() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      className="relative z-0 h-[70vh] w-full"
      aria-label="Carte du trajet"
    >
      {/* Bouton pour remonter : toujours visible au-dessus de la carte */}
      <div className="absolute left-1/2 top-3 z-[60] -translate-x-1/2">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#A55734] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-[#8b4728]"
          aria-label="Remonter en haut de la page"
        >
          Remonter
        </a>
      </div>
      <MapboxMap />
    </section>
  );
}
