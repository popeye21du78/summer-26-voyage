import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InspirationExploreClient from "@/components/planifier/InspirationExploreClient";

export default function PlanifierInspirationPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <main className="page-under-header mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/accueil#on-repart"
        className="mb-6 inline-flex items-center gap-1 font-courier text-sm font-bold text-[#A55734] hover:text-[#8b4728]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Accueil
      </Link>
      <h1 className="font-courier text-2xl font-bold text-[#333]">Carte d’inspiration</h1>
      <p className="mt-2 max-w-2xl font-courier text-sm leading-relaxed text-[#333]/85">
        Environ 25 régions sur la carte (départements regroupés), puis territoires éditoriaux. Filtre
        par envie, clique une zone ou la liste, ouvre la fiche ou lance un voyage.
      </p>
      <div className="mt-8">
        <InspirationExploreClient mapboxAccessToken={token} />
      </div>
    </main>
  );
}
