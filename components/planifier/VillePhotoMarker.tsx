"use client";

import { useEffect, useState } from "react";
import {
  getClientPublicPhotoPick,
} from "@/lib/public-photo-client";
import { tryUserValidatedPhoto } from "@/lib/client-photo-validated";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";

/**
 * Marker de lieu sur la carte d'inspiration.
 * Affiche un rond 48-56px avec la photo validée / indexée de la ville,
 * ou un gradient orangé en fallback, avec le nom en label collé dessous.
 */
export default function VillePhotoMarker({
  slug,
  nom,
  tier,
  onClick,
}: {
  slug: string;
  nom: string;
  tier: "strong" | "saved" | "standard";
  onClick: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPhotoValidationSnapshot()
      .then(() => {
        if (cancelled) return;
        /** Priorité : URL validée par l'user → index embedded (top 200 + validations statiques). */
        const user = tryUserValidatedPhoto(slug, slug);
        if (user) {
          setPhotoUrl(user);
          return;
        }
        const pick = getClientPublicPhotoPick(slug, slug, 0);
        if (pick?.url) setPhotoUrl(pick.url);
      })
      .catch(() => {
        /* ignore, fallback visuel */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const size = tier === "strong" ? 48 : tier === "saved" ? 44 : 40;
  const ringColor =
    tier === "strong"
      ? "ring-[var(--color-accent-start)]"
      : tier === "saved"
        ? "ring-[var(--color-accent-start)]/70"
        : "ring-white/80";
  const borderWidth = tier === "strong" ? 3 : 2;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group relative flex cursor-pointer touch-manipulation items-center justify-center rounded-full bg-white shadow-[0_6px_16px_rgba(0,0,0,0.28)] ring-2 transition hover:scale-[1.03] ${ringColor}`}
      style={{ width: size, height: size, borderWidth, borderColor: "#ffffff", borderStyle: "solid" }}
      aria-label={nom}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs dynamiques Commons / Unsplash
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-courier text-base font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end))",
          }}
        >
          {nom.charAt(0).toUpperCase()}
        </span>
      )}
      {/* Label nom à droite du rond (collé, toujours visible). */}
      <span
        className="pointer-events-none absolute left-full top-1/2 z-[1] ml-1 max-w-[min(120px,28vw)] -translate-y-1/2 truncate rounded-md bg-white/95 px-1 py-0.5 font-courier text-[9px] font-bold leading-none text-[var(--color-bg-main)] shadow"
        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}
      >
        {nom}
      </span>
    </button>
  );
}
