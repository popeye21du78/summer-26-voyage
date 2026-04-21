import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InspirationExploreClient from "@/components/planifier/InspirationExploreClient";

export default function PlanifierInspirationPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <main className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#fff0e6] via-[#ffe8dc] to-[#f5d4c4] pt-[env(safe-area-inset-top)]">
      <Link
        href="/planifier"
        className="absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-30 inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-end)]/20 bg-white/90 px-3 py-1.5 font-courier text-xs font-bold text-[var(--color-accent-end)] shadow-sm backdrop-blur-sm hover:bg-[#FFF2EB] lg:text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Planifier
      </Link>
      <div className="min-h-0 flex-1 overflow-hidden p-0">
        <InspirationExploreClient mapboxAccessToken={token} />
      </div>
    </main>
  );
}
