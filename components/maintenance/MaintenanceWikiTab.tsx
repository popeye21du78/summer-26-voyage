"use client";

import { useCallback, useEffect, useState } from "react";
import {
  resolveWikiResumeSlug,
  persistMaintenanceResumeSlug,
} from "@/lib/maintenance-ui-persist";
type CommonsPhoto = {
  url: string;
  title: string;
  author: string;
  sourceUrl: string;
  width: number;
  height: number;
};

type CityRow = {
  slug: string;
  nom: string;
  departement: string;
  code_dep: string;
  categorie_taille: string;
};

export default function MaintenanceWikiTab() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [slug, setSlug] = useState("");
  const [minWidth, setMinWidth] = useState(800);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    photos: CommonsPhoto[];
    query: string;
    totalCandidates: number;
    hasMore: boolean;
    fetchMs: number;
    nom: string;
    windowSize: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/maintenance/wiki-cities")
      .then((r) => r.json())
      .then((j) => {
        const list = j.items ?? [];
        setCities(list);
        if (list.length) {
          const r = resolveWikiResumeSlug(list);
          setSlug(r ?? list[0].slug);
        }
      })
      .catch(() => setError("Liste villes introuvable"))
      .finally(() => setLoadingList(false));
  }, []);

  const fetchCandidates = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(
      `/api/maintenance/photo-candidates?slug=${encodeURIComponent(slug)}&offset=${offset}&minWidth=${minWidth}&mode=big_cities`
    )
      .then((r) => (r.ok ? r.json() : r.json().then((x) => Promise.reject(x.error ?? r.status))))
      .then((j) => {
        setData({
          photos: j.photos ?? [],
          query: j.query ?? "",
          totalCandidates: j.totalCandidates ?? 0,
          hasMore: j.hasMore ?? false,
          fetchMs: j.fetchMs ?? 0,
          nom: j.nom ?? "",
          windowSize: typeof j.windowSize === "number" ? j.windowSize : 5,
        });
      })
      .catch((e) => {
        setError(String(e));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [slug, offset, minWidth]);

  useEffect(() => {
    setOffset(0);
  }, [slug, minWidth]);

  useEffect(() => {
    if (slug) persistMaintenanceResumeSlug("wiki", slug);
  }, [slug]);

  useEffect(() => {
    if (!slug || loadingList) return;
    fetchCandidates();
  }, [slug, offset, minWidth, loadingList, fetchCandidates]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#333]/85">
        Focus sur les <strong>grandes et moyennes villes</strong> (tri par population décroissante). Même moteur
        Commons que l’app : requête <code className="rounded bg-[#FFF2EB] px-1 text-xs">« Nom France »</code>.
        Utile pour juger la <strong>pertinence</strong> et le <strong>temps de chargement</strong> quand les
        descriptions batch n’ont pas de lieu précis.
      </p>

      {loadingList ? (
        <p className="text-sm text-[#333]/70">Chargement…</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-accent-end)]/20 bg-white p-3">
          <label className="text-xs font-medium text-[#333]">
            Ville ({cities.length} dans la liste)
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 block w-full min-w-[240px] rounded border border-[var(--color-accent-end)]/30 px-2 py-1.5 text-sm"
            >
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nom} ({c.code_dep}) · {c.categorie_taille}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#333]">
            Largeur min.
            <select
              value={minWidth}
              onChange={(e) => setMinWidth(Number(e.target.value))}
              className="mt-1 block rounded border border-[var(--color-accent-end)]/30 px-2 py-1.5 text-sm"
            >
              <option value={400}>400 px</option>
              <option value={800}>800 px</option>
              <option value={1000}>1000 px</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void fetchCandidates()}
            className="rounded bg-[var(--color-accent-end)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-accent-end)]"
          >
            Recharger
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && <p className="text-sm text-[#333]/70">Requête Commons…</p>}

      {data && !loading && (
        <>
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              data.fetchMs < 1500
                ? "border-green-600/30 bg-green-50/80 text-green-900"
                : data.fetchMs < 4000
                  ? "border-amber-600/40 bg-amber-50/80 text-amber-950"
                  : "border-red-300 bg-red-50/80 text-red-900"
            }`}
          >
            <strong>Temps API → candidats triés : {data.fetchMs} ms</strong>
            <span className="ml-2 text-xs opacity-90">
              ({data.fetchMs < 1500 ? "rapide" : data.fetchMs < 4000 ? "acceptable" : "lent — réseau ou Commons"})
            </span>
            <p className="mt-1 text-xs">
              Requête : <code className="rounded bg-white/80 px-1">{data.query}</code> · {data.totalCandidates}{" "}
              candidat(s) · offset {offset}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {data.photos.map((p) => (
              <div key={p.url} className="overflow-hidden rounded-lg border border-[var(--color-accent-end)]/15 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                <p className="line-clamp-2 p-2 text-[10px] text-[#333]/80">{p.title}</p>
              </div>
            ))}
          </div>

          {data.hasMore && (
            <button
              type="button"
              onClick={() => setOffset((o) => o + data.windowSize)}
              className="text-sm text-[var(--color-accent-end)] underline"
            >
              {data.windowSize} suivantes
            </button>
          )}
        </>
      )}
    </div>
  );
}
