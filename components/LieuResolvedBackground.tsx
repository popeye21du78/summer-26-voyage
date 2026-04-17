"use client";

import { useEffect, useState } from "react";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";
import {
  cacheKeysLieuResolve,
  cachePhotoUrl,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import { tryUserValidatedPhoto } from "@/lib/client-photo-validated";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import { getClientPublicPhotoPick } from "@/lib/public-photo-client";

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
 * Même chaîne de résolution que `CityPhoto` (validations, snapshot, index, puis APIs).
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
    const cacheKey = cacheKeysLieuResolve(slug, stepId);

    (async () => {
      await loadPhotoValidationSnapshot();
      if (dead) return;

      const phone = tryUserValidatedPhoto(slug, stepId);
      const cached = getCachedPhotoUrl(cacheKey);
      const embedded = getClientPublicPhotoPick(slug, stepId, 0);
      const resolved = phone ?? cached ?? embedded?.url ?? null;
      if (resolved) {
        setUrl(resolved);
        cachePhotoUrl(cacheKey, resolved);
        return;
      }

      try {
        const r = await fetch(
          `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(stepId)}&photoIndex=0`
        );
        const j = r.ok ? await r.json() : null;
        if (dead) return;
        if (j?.url) {
          cachePhotoUrl(cacheKey, j.url);
          setUrl(j.url);
          return;
        }
      } catch {
        /* suite */
      }

      try {
        const r2 = await fetch(
          `/api/photo-lieu?${new URLSearchParams({ ville, slug })}`
        );
        const j2 = r2.ok ? await r2.json() : null;
        if (!dead && j2?.url) setUrl(j2.url);
      } catch {
        /* gradient */
      }
    })();

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
