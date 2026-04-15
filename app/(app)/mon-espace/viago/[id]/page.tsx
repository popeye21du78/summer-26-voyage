import { Suspense } from "react";
import ViagoPageClient from "@/components/ViagoPageClient";

export default function ViagoPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center bg-[#1a1a1a]">
            <p className="font-courier text-white/60">Chargement…</p>
          </div>
        }
      >
        <ViagoPageClient />
      </Suspense>
    </div>
  );
}
