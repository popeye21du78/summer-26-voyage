"use client";

import { useEffect, useState } from "react";
import { getProfileIdCached, peekProfileIdCached } from "@/lib/me-client";

/**
 * Profil courant (cookie van_auth / GET /api/me). Utilisé pour préfixer le localStorage.
 * S’appuie sur {@link getProfileIdCached} pour mutualiser l’appel réseau.
 */
export function useProfileId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(() =>
    peekProfileIdCached() === undefined ? undefined : peekProfileIdCached() ?? null
  );

  useEffect(() => {
    let cancelled = false;
    getProfileIdCached().then((resolved) => {
      if (!cancelled) setId(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return id;
}
