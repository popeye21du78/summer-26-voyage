"use client";

import dynamic from "next/dynamic";

const MapboxMap = dynamic(() => import("./MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#FFFFFF]">
      <p className="text-[#333333]">Chargement de la carte…</p>
    </div>
  ),
});

export default function MapView() {
  return (
    <main className="h-screen w-full">
      <MapboxMap />
    </main>
  );
}
