"use client";

import { Heart } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  isFavoriteKind,
  toggleFavoriteKind,
} from "@/lib/inspiration-favorites-toggle";
import type { FavoriteKind } from "@/lib/planifier-favorites";

type Props = {
  kind: FavoriteKind;
  refId: string;
  label: string;
  className?: string;
  meta?: Record<string, unknown>;
};

export default function FavoriteButton({
  kind,
  refId,
  label,
  className = "",
  meta,
}: Props) {
  const [on, setOn] = useState(() => isFavoriteKind(kind, refId));

  const toggle = useCallback(() => {
    const next = toggleFavoriteKind(kind, refId, label, "inspiration", meta);
    setOn(next);
  }, [kind, refId, label, meta]);

  const aria = useMemo(
    () => (on ? "Retirer des coups de cœur" : "Ajouter aux coups de cœur"),
    [on]
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={aria}
      title={aria}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#A55734]/25 bg-white/90 text-[#A55734] shadow-sm transition hover:bg-[#FFF2EB] ${on ? "text-[#D4635B]" : ""} ${className}`}
    >
      <Heart className={`h-5 w-5 ${on ? "fill-current" : ""}`} />
    </button>
  );
}
