"use client";

import { useCallback, useState, useEffect } from "react";
import { Heart, GraduationCap } from "lucide-react";
import {
  isFavoriteKind,
  toggleFavoriteKind,
} from "@/lib/inspiration-favorites-toggle";

/**
 * Actions rapides "cœur" (coup de cœur) + "chapeau" (je connais) en overlay
 * sur une photo de ville / POI. Apparaissent DIRECTEMENT sur la photo, avant
 * que la fiche détaillée ne soit ouverte — demande explicite de l'user :
 *   « sur les photos des villes dans inspirer, avant qu'on ait les infos
 *     de villes qui sortent on ait un bouton chapeau pour ajouter à je connais
 *     et un bouton cœur pour ajouter à cœur ».
 *
 * Design :
 *   - Positionné en absolute top-right de la photo.
 *   - Un seul click = toggle (persistant via localStorage).
 *   - stopPropagation : l'user peut liker/marquer sans ouvrir la fiche.
 *   - `size` compact pour ne pas écraser la photo.
 *
 * Stockage : même système que `PlaceAffinityActions` → les favoris et
 * "je connais" apparaissent dans la section correspondante de Mon Espace.
 */
export default function PhotoQuickAffinity({
  placeSlug,
  placeLabel,
  position = "top-right",
  size = "sm",
}: {
  placeSlug: string;
  placeLabel: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  size?: "xs" | "sm" | "md";
}) {
  /** État lu une fois puis toggle-only — pas d'abonnement reactif pour garder le composant léger. */
  const [favorite, setFavorite] = useState(false);
  const [known, setKnown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFavorite(isFavoriteKind("place", placeSlug));
    setKnown(isFavoriteKind("known_place", placeSlug));
    setMounted(true);
  }, [placeSlug]);

  const onFavorite = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = toggleFavoriteKind(
        "place",
        placeSlug,
        placeLabel,
        "inspiration"
      );
      setFavorite(next);
    },
    [placeSlug, placeLabel]
  );

  const onKnown = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = toggleFavoriteKind(
        "known_place",
        placeSlug,
        placeLabel,
        "inspiration",
        { known: true }
      );
      setKnown(next);
    },
    [placeSlug, placeLabel]
  );

  if (!mounted) return null;

  const positionCls: Record<typeof position, string> = {
    "top-right": "top-1.5 right-1.5",
    "top-left": "top-1.5 left-1.5",
    "bottom-right": "bottom-1.5 right-1.5",
    "bottom-left": "bottom-1.5 left-1.5",
  };

  const btnSize =
    size === "xs"
      ? "h-6 w-6"
      : size === "sm"
        ? "h-7 w-7"
        : "h-9 w-9";
  const iconSize =
    size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={`pointer-events-auto absolute z-[60] flex gap-1 ${positionCls[position]}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onKnown}
        aria-label={known ? "Retirer de Je connais" : "Marquer Je connais"}
        title={known ? "Retirer de Je connais" : "Je connais"}
        className={`${btnSize} flex items-center justify-center rounded-full border backdrop-blur-md shadow-md transition ${
          known
            ? "border-emerald-300/80 bg-emerald-500/85 text-white"
            : "border-white/40 bg-black/55 text-white/90 hover:bg-black/70"
        }`}
      >
        <GraduationCap className={iconSize} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={onFavorite}
        aria-label={favorite ? "Retirer des coups de cœur" : "Ajouter aux coups de cœur"}
        title={favorite ? "Retirer des coups de cœur" : "Coup de cœur"}
        className={`${btnSize} flex items-center justify-center rounded-full border backdrop-blur-md shadow-md transition ${
          favorite
            ? "border-[var(--color-accent-start)]/80 bg-[var(--color-accent-start)]/90 text-white"
            : "border-white/40 bg-black/55 text-white/90 hover:bg-black/70"
        }`}
      >
        <Heart
          className={iconSize}
          strokeWidth={2.2}
          fill={favorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
