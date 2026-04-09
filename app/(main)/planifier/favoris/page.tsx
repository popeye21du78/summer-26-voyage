"use client";

import dynamic from "next/dynamic";

const FavorisPageClient = dynamic(
  () => import("@/components/planifier/FavorisPageClient"),
  { ssr: false, loading: () => <p className="page-under-header p-8 font-courier text-[#333]/70">Chargement…</p> }
);

export default function PlanifierFavorisPage() {
  return <FavorisPageClient />;
}
