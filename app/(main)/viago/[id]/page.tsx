import { Suspense } from "react";
import ViagoPageClient from "@/components/ViagoPageClient";

export default function ViagoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center bg-[#1a1a1a]">
          <p className="font-courier text-white/70">Chargement…</p>
        </main>
      }
    >
      <ViagoPageClient />
    </Suspense>
  );
}
