import { Suspense } from "react";
import ViagoPageClient from "@/components/ViagoPageClient";

export default function ViagoPage() {
  /**
   * Pas d'overflow-hidden ici : AppScrollShell (layout (app)) est le seul scroll.
   * Double scroll = viago coincé en hauteur = user bloqué.
   */
  return (
    <div className="flex min-h-full w-full flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-[var(--color-bg-secondary)]">
            <p className="font-courier text-white/60">Chargement…</p>
          </div>
        }
      >
        <ViagoPageClient />
      </Suspense>
    </div>
  );
}
