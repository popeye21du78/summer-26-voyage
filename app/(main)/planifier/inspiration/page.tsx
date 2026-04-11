import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InspirationExploreClient from "@/components/planifier/InspirationExploreClient";

export default function PlanifierInspirationPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <main
      className="fixed inset-x-0 bottom-0 z-0 flex flex-col overflow-hidden bg-[#FAF4F0]"
      style={{ top: "var(--header-content-offset)" }}
    >
      <div className="shrink-0 px-3 pt-2 sm:px-4">
        <Link
          href="/accueil#on-repart"
          className="inline-flex items-center gap-1 font-courier text-sm font-bold text-[#A55734] hover:text-[#8b4728]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Accueil
        </Link>
        <h1 className="mt-1 font-courier text-xl font-bold text-[#333] sm:text-2xl">Carte d’inspiration</h1>
        <p className="mt-0.5 max-w-2xl font-courier text-xs leading-relaxed text-[#333]/80 sm:text-sm">
          Carte plein écran et bandeau régions — puis fiches et itinéraires.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 sm:px-3">
        <InspirationExploreClient mapboxAccessToken={token} />
      </div>
    </main>
  );
}
