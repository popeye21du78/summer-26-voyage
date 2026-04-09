"use client";

import { useEffect, useState } from "react";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";

type Props = {
  ville: string;
  stepId: string;
  /** Si défini (ex. photo ajoutée par l’utilisateur), pas d’appel API. */
  preferUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "children">;

const FALLBACK_BG =
  "linear-gradient(135deg, #5D3A1A 0%, #8B4513 50%, #A0522D 100%)";

/**
 * Fond `background-image: cover` résolu via /api/photo-lieu (validations + Wikipédia / Commons…).
 */
export function LieuResolvedBackground({
  ville,
  stepId,
  preferUrl,
  className,
  style,
  children,
  ...divProps
}: Props) {
  const [url, setUrl] = useState<string | null>(() => (preferUrl?.trim() ? preferUrl : null));

  useEffect(() => {
    if (preferUrl?.trim()) {
      setUrl(preferUrl.trim());
      return;
    }
    let dead = false;
    const slug = slugForLieuPhoto(stepId, ville);
    fetch(`/api/photo-lieu?${new URLSearchParams({ ville, slug })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { url?: string } | null) => {
        if (!dead && j?.url) setUrl(j.url);
      })
      .catch(() => {
        /* gradient fallback */
      });
    return () => {
      dead = true;
    };
  }, [ville, stepId, preferUrl]);

  const bgImage = url ? `url(${url})` : FALLBACK_BG;

  return (
    <div
      {...divProps}
      className={className}
      style={{
        backgroundImage: bgImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
