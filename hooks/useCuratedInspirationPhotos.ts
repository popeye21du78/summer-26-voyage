"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "viago:inspiration-curated-photos";

type Store = {
  assignments: Record<string, string>;
  usedUrls: string[];
};

function readStore(): Store {
  if (typeof window === "undefined") return { assignments: {}, usedUrls: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const p = raw ? JSON.parse(raw) : null;
    if (!p || typeof p !== "object") return { assignments: {}, usedUrls: [] };
    return {
      assignments: typeof p.assignments === "object" && p.assignments ? p.assignments : {},
      usedUrls: Array.isArray(p.usedUrls) ? p.usedUrls : [],
    };
  } catch {
    return { assignments: {}, usedUrls: [] };
  }
}

function writeStore(s: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/**
 * Une photo stable par clé logique (région, carte carrousel, héros voyage…),
 * tirée du pool validé sans réutiliser une URL déjà assignée ailleurs.
 */
export function useCuratedAssignmentPhoto(
  key: string | null,
  regionId: string | null,
  slugsCsv?: string
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!key || !regionId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({ regionId });
    if (slugsCsv) qs.set("slugs", slugsCsv);
    fetch(`/api/inspiration/curated-pool?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { urls?: string[] }) => {
        if (cancelled) return;
        const candidates = Array.isArray(d.urls) ? d.urls : [];
        if (candidates.length === 0) return;
        const store = readStore();
        const existing = store.assignments[key];
        if (existing && candidates.includes(existing)) {
          setUrl(existing);
          return;
        }
        const used = new Set(store.usedUrls);
        const pick = candidates.find((u) => !used.has(u)) ?? candidates[0];
        store.assignments[key] = pick;
        if (!store.usedUrls.includes(pick)) store.usedUrls.push(pick);
        writeStore(store);
        setUrl(pick);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [key, regionId, slugsCsv]);

  return url;
}

/** Plusieurs vignettes (carrousel région) : clés distinctes, une requête pool. */
export function useRegionCuratedGallery(regionId: string | null, slotKeys: string[]) {
  const [urls, setUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (!regionId || slotKeys.length === 0) {
      setUrls([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/inspiration/curated-pool?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => r.json())
      .then((d: { urls?: string[] }) => {
        if (cancelled) return;
        const candidates = Array.isArray(d.urls) ? d.urls : [];
        if (candidates.length === 0) {
          setUrls(slotKeys.map(() => null));
          return;
        }
        const store = readStore();
        const used = new Set(store.usedUrls);
        const out: (string | null)[] = [];
        for (let i = 0; i < slotKeys.length; i++) {
          const sk = slotKeys[i];
          const fullKey = `gallery:${regionId}:${sk}`;
          const existing = store.assignments[fullKey];
          if (existing && candidates.includes(existing)) {
            out.push(existing);
            continue;
          }
          const pick = candidates.find((u) => !used.has(u)) ?? candidates[i % candidates.length];
          store.assignments[fullKey] = pick;
          if (!used.has(pick)) {
            used.add(pick);
            store.usedUrls.push(pick);
          }
          out.push(pick);
        }
        writeStore(store);
        setUrls(out);
      })
      .catch(() => setUrls(slotKeys.map(() => null)));

    return () => {
      cancelled = true;
    };
  }, [regionId, slotKeys.join("|")]);

  return urls;
}
