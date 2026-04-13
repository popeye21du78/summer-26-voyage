"use client";

import { Map } from "lucide-react";
import type { Voyage } from "../data/mock-voyages";
import { LieuResolvedBackground } from "./LieuResolvedBackground";

export default function VoyageCoverThumb({
  voyage,
  className = "h-14 w-20 shrink-0 rounded-xl shadow-inner ring-1 ring-[#E07856]/20",
}: {
  voyage: Voyage;
  /** Harmonisation cartes liste (carré 52px, etc.). */
  className?: string;
}) {
  const first = voyage.steps?.[0];
  if (!first) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E07856]/15">
        <Map className="h-6 w-6 text-[#E07856]" />
      </div>
    );
  }

  return (
    <LieuResolvedBackground
      ville={first.nom}
      stepId={first.id}
      className={className}
      role="img"
      aria-hidden
    />
  );
}
