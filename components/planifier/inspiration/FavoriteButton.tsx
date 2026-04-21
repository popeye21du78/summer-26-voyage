"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
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
    <motion.button
      type="button"
      onClick={toggle}
      aria-label={aria}
      title={aria}
      whileTap={{ scale: 0.88 }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent-start)]/25 bg-white/90 text-[var(--color-accent-start)] shadow-sm transition hover:bg-[var(--color-bg-main)] ${on ? "text-[var(--color-accent-mid)]" : ""} ${className}`}
    >
      <motion.span
        key={on ? "on" : "off"}
        initial={false}
        animate={on ? { scale: [1, 1.28, 1] } : { scale: 1 }}
        transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
        className="inline-flex"
      >
        <Heart className={`h-5 w-5 ${on ? "fill-current" : ""}`} />
      </motion.span>
    </motion.button>
  );
}
