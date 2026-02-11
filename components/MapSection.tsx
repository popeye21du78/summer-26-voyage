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
  return (
    <section
      className="relative h-[70vh] w-full"
      aria-label="Carte du trajet"
    >
      <MapboxMap />
    </section>
  );
}
