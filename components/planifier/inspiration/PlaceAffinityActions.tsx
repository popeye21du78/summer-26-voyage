"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { isFavoriteKind, toggleFavoriteKind } from "@/lib/inspiration-favorites-toggle";

type Props = {
  placeSlug: string;
  placeLabel: string;
  compact?: boolean;
};

export default function PlaceAffinityActions({
  placeSlug,
  placeLabel,
  compact = false,
}: Props) {
  const [known, setKnown] = useState(() => isFavoriteKind("known_place", placeSlug));

  const toggleKnown = useCallback(() => {
    const next = toggleFavoriteKind(
      "known_place",
      placeSlug,
      placeLabel,
      "inspiration",
      { known: true }
    );
    setKnown(next);
  }, [placeSlug, placeLabel]);

  const knownLabel = useMemo(
    () => (known ? "Retirer de Je connais" : "Marquer Je connais"),
    [known]
  );

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "pt-1"}`}>
      <FavoriteButton kind="place" refId={placeSlug} label={placeLabel} />
      <button
        type="button"
        onClick={toggleKnown}
        aria-label={knownLabel}
        title={knownLabel}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 font-courier text-[10px] font-bold uppercase tracking-wider transition ${
          known
            ? "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
            : "border-white/20 bg-white/10 text-white/70 hover:border-white/35"
        }`}
      >
        <CheckCircle2 className={`h-4 w-4 ${known ? "fill-current" : ""}`} />
        Je connais
      </button>
    </div>
  );
}
