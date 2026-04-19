"use client";

import { useEffect, useState } from "react";
import { readReturnTo } from "@/lib/return-to";

/**
 * URL de retour fiable : `returnTo` dans la query si présent et sûr, sinon `fallback`.
 * Évite `router.back()` qui peut sauter plusieurs pages ou sortir de l’app.
 */
export function useReturnHref(fallback: string): string {
  const [href, setHref] = useState(fallback);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = readReturnTo(sp);
    setHref(r ?? fallback);
  }, [fallback]);

  return href;
}
