"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Loader2, Save, ArrowUp } from "lucide-react";

type CommonsPhoto = {
  url: string;
  sourceUrl?: string;
  title?: string;
  author?: string;
  license?: string;
};

type LieuData = {
  slug: string;
  nom: string;
  header: CommonsPhoto[];
  lieux: { label: string; photos: CommonsPhoto[] }[];
};

type Selections = {
  header: string[];
  lieux: Record<string, string | null>;
};

const BATCH_SIZE = 25;

function LieuCard({
  slug,
  initialSelections,
  onSave,
}: {
  slug: string;
  initialSelections: Selections | null;
  onSave: () => void;
}) {
  const [data, setData] = useState<LieuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerSelected, setHeaderSelected] = useState<Set<string>>(
    () => new Set(initialSelections?.header ?? [])
  );
  const [lieuxSelected, setLieuxSelected] = useState<Record<string, string | null>>(
    () => ({ ...initialSelections?.lieux } ?? {})
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch(`/api/photo-selection-lieu/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleHeader = useCallback((url: string) => {
    setHeaderSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);

  const selectLieuPhoto = useCallback((label: string, url: string | null) => {
    setLieuxSelected((prev) => ({
      ...prev,
      [label]: prev[label] === url ? null : url,
    }));
  }, []);

  const addToHeader = useCallback((url: string) => {
    setHeaderSelected((prev) => new Set(prev).add(url));
  }, []);

  const handleTerminer = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/photo-selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          header: Array.from(headerSelected),
          lieux: lieuxSelected,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [slug, headerSelected, lieuxSelected, onSave]);

  if (loading) {
    return (
      <div
        ref={ref}
        className="rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-6"
      >
        <div className="flex items-center gap-2 text-[#333]/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement {slug}…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        ref={ref}
        className="rounded-lg border border-red-200 bg-red-50/50 p-6"
      >
        <p className="text-red-600">{slug} : {error ?? "Données manquantes"}</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="rounded-lg border border-[#A55734]/30 bg-white shadow-sm"
    >
      <div className="border-b border-[#A55734]/20 bg-[#FFF2EB]/40 px-4 py-3">
        <h2 className="text-lg font-medium text-[#333]">
          {data.nom} <span className="text-sm font-normal text-[#333]/60">({slug})</span>
        </h2>
      </div>

      <div className="space-y-6 p-4">
        {/* Header */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-[#333]/80">Header</h3>
          <div className="flex flex-wrap gap-2">
            {(data.header ?? []).map((p) => {
              const sel = headerSelected.has(p.url);
              return (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => toggleHeader(p.url)}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    sel ? "border-[#A55734] ring-2 ring-[#A55734]/30" : "border-gray-200 hover:border-[#A55734]/50"
                  }`}
                >
                  <img
                    src={p.url}
                    alt={p.title ?? ""}
                    loading="lazy"
                    className="h-24 w-32 object-cover"
                  />
                  {sel && (
                    <span className="absolute right-1 top-1 rounded-full bg-[#A55734] p-1 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Lieux */}
        {(data.lieux ?? []).map((l) => (
          <section key={l.label}>
            <h3 className="mb-2 text-sm font-medium text-[#333]/80">{l.label}</h3>
            <div className="flex flex-wrap gap-2">
              {l.photos?.length ? (
                l.photos.map((p) => {
                  const sel = lieuxSelected[l.label] === p.url;
                  return (
                    <div key={p.url} className="relative">
                      <button
                        type="button"
                        onClick={() => selectLieuPhoto(l.label, sel ? null : p.url)}
                        className={`relative block overflow-hidden rounded-lg border-2 transition-all ${
                          sel ? "border-[#A55734] ring-2 ring-[#A55734]/30" : "border-gray-200 hover:border-[#A55734]/50"
                        }`}
                      >
                        <img
                          src={p.url}
                          alt={p.title ?? ""}
                          loading="lazy"
                          className="h-24 w-32 object-cover"
                        />
                        {sel && (
                          <span className="absolute right-1 top-1 rounded-full bg-[#A55734] p-1 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => addToHeader(p.url)}
                        title="Utiliser comme header"
                        className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                      >
                        <ArrowUp className="inline h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <span className="text-sm text-[#333]/50">Aucune photo</span>
              )}
            </div>
          </section>
        ))}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleTerminer}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white hover:bg-[#A55734]/90 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Sauvegarde…" : saved ? "Sauvegardé" : "Terminer le lieu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectionPhotosPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selections, setSelections] = useState<Record<string, Selections>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadSlugs = useCallback(async (skip: number) => {
    const res = await fetch(
      `/api/photo-selection-lieux?skip=${skip}&limit=${BATCH_SIZE}`
    );
    const json = await res.json();
    return { slugs: json.slugs ?? [], total: json.total ?? 0 };
  }, []);

  useEffect(() => {
    loadSlugs(0).then(({ slugs: s, total: t }) => {
      setSlugs(s);
      setTotal(t);
      setLoading(false);
    });
  }, [loadSlugs]);

  useEffect(() => {
    fetch("/api/photo-selections")
      .then((r) => r.json())
      .then(setSelections)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore || slugs.length >= total) return;
        setLoadingMore(true);
        loadSlugs(slugs.length).then(({ slugs: newSlugs }) => {
          setSlugs((prev) => [...prev, ...newSlugs]);
          setLoadingMore(false);
        });
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [slugs.length, total, loadingMore, loadSlugs]);

  const refreshSelections = useCallback(() => {
    fetch("/api/photo-selections")
      .then((r) => r.json())
      .then(setSelections)
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#A55734]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-[#333]">
          Sélection des photos par lieu
        </h1>
        <p className="mt-2 text-sm text-[#333]/70">
          {slugs.length} / {total} lieux chargés. Clique sur les photos pour les sélectionner.
          Header : plusieurs possibles. Lieux : une par catégorie.
        </p>
      </div>

      <div className="space-y-8">
        {slugs.map((slug) => (
          <LieuCard
            key={slug}
            slug={slug}
            initialSelections={selections[slug] ?? null}
            onSave={refreshSelections}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#A55734]" />
        </div>
      )}
    </div>
  );
}
