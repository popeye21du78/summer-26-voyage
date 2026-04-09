"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveMaintenanceQueueIndex,
  persistMaintenanceResumeSlug,
  persistMaintenanceLastValidatedSlug,
} from "@/lib/maintenance-ui-persist";
type CommonsPhoto = {
  url: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
};

type QueueItem = {
  slug: string;
  nom: string;
  departement: string;
  code_dep: string;
  categorie_taille: string;
  score_esthetique: number;
  raison: string;
  validationStatus: string | null;
  hasValidatedPhoto: boolean;
  validatedPhotoCount?: number;
  validatedUrls?: string[];
};

export default function MaintenancePhotosTab() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [minWidth, setMinWidth] = useState(800);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
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

  const loadQueue = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoadingList(true);
    fetch("/api/maintenance/photo-queue")
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items ?? []);
        setError(null);
      })
      .catch(() => {
        if (!silent) setError("Impossible de charger la file");
      })
      .finally(() => {
        if (!silent) setLoadingList(false);
      });
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (loadingList || items.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const i = resolveMaintenanceQueueIndex(items, "commons");
    if (i > 0) setIndex(i);
  }, [loadingList, items]);

  const current = items[index];

  useEffect(() => {
    const s = items[index]?.slug;
    if (s && !loadingList) persistMaintenanceResumeSlug("commons", s);
  }, [items, index, loadingList]);

  useEffect(() => {
    setOffset(0);
  }, [index, minWidth]);

  useEffect(() => {
    if (!current?.slug) {
      setData(null);
      return;
    }
    setLoadingPhotos(true);
    setError(null);
    fetch(
      `/api/maintenance/photo-candidates?slug=${encodeURIComponent(current.slug)}&offset=${offset}&minWidth=${minWidth}`
    )
      .then((r) => (r.ok ? r.json() : r.json().then((x) => Promise.reject(x.error ?? r.status))))
      .then((j) => {
        setData({
          photos: j.photos ?? [],
          query: j.query ?? "",
          totalCandidates: j.totalCandidates ?? 0,
          hasMore: j.hasMore ?? false,
          fetchMs: j.fetchMs ?? 0,
          nom: j.nom ?? current.nom,
          windowSize: typeof j.windowSize === "number" ? j.windowSize : 5,
        });
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingPhotos(false));
  }, [current?.slug, current?.nom, offset, minWidth]);

  async function postValidation(
    action: "validate" | "unvalidate" | "reject_batch" | "skip",
    photo?: CommonsPhoto
  ) {
    if (!current) return;
    const res = await fetch("/api/maintenance/photo-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: current.slug,
        action,
        photo,
        searchQuery: data?.query,
        offset,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erreur sauvegarde");
      return;
    }
    setError(null);
    if (action === "validate" && photo) {
      persistMaintenanceLastValidatedSlug("commons", current.slug);
      setItems((prev) =>
        prev.map((it) => {
          if (it.slug !== current.slug) return it;
          const urls = it.validatedUrls ?? [];
          if (urls.includes(photo.url)) return it;
          const nextUrls = [...urls, photo.url];
          return {
            ...it,
            validationStatus: "validated",
            hasValidatedPhoto: true,
            validatedPhotoCount: nextUrls.length,
            validatedUrls: nextUrls,
          };
        })
      );
    }
    if (action === "unvalidate" && photo) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.slug !== current.slug) return it;
          const nextUrls = (it.validatedUrls ?? []).filter((u) => u !== photo.url);
          return {
            ...it,
            validatedUrls: nextUrls,
            validatedPhotoCount: nextUrls.length,
            hasValidatedPhoto: nextUrls.length > 0,
            validationStatus: nextUrls.length > 0 ? "validated" : null,
          };
        })
      );
    }
    loadQueue({ silent: true });
    if (action === "skip") {
      if (index < items.length - 1) setIndex((i) => i + 1);
    }
    if (action === "reject_batch") {
      const step = data?.windowSize ?? 5;
      setOffset((o) => o + step);
    }
  }

  if (loadingList) {
    return <p className="text-sm text-[#333]/70">Chargement de la file…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        Aucun lieu dans la file (vérifie <code className="rounded bg-[#FFF2EB] px-1">data/cities/lieux-central.json</code>
        ).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#333]/85">
        Villes / villages <strong>9–10</strong>, châteaux et sites naturels <strong>≥ 8</strong>, plus une liste
        courte de monuments remarquables. Une ville à la fois ; tu peux <strong>valider autant de photos que tu veux</strong>{" "}
        (reste sur le lieu, puis « Suivant » quand tu as fini). Ta place dans la liste est mémorisée sur cet appareil
        (retour sur la dernière ville validée ou consultée). Fichier :{" "}
        <code className="rounded bg-[#FFF2EB] px-1 text-xs">data/maintenance/photo-validations.json</code>.
      </p>
      <p className="rounded-lg border border-[#A55734]/15 bg-[#FFF8F0]/90 p-3 text-xs leading-relaxed text-[#333]/85">
        <strong>Quota Commons (réaliste)</strong> : chaque fois que tu charges des candidats ou que tu cliques sur « afficher
        d’autres », le serveur fait <strong>une</strong> requête vers <code className="rounded bg-white px-0.5">api.php</code>{" "}
        (jusqu’à 50 résultats triés côté serveur). Afficher <strong>5</strong> vignettes au lieu de 3 ne change pas ce nombre :
        pas d’appel API en plus. Les images elles-mêmes viennent du CDN Wikimedia (autre canal). Wikimedia ne publie pas un
        plafond « X photos/heure » pour la lecture ; en pratique il faut un User-Agent honnête et éviter les rafales. À titre
        indicatif, un usage raisonnable (centaines d’appels/heure espacés) reste dans les usages courants ; si tu enchaînais
        des milliers d’actions par heure, il faudrait ralentir ou demander un compte bot.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#A55734]/20 bg-white p-3">
        <label className="text-xs font-medium text-[#333]">
          Lieu ({index + 1} / {items.length})
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mt-1 block w-full min-w-[220px] rounded border border-[#A55734]/30 px-2 py-1.5 text-sm"
          >
            {items.map((it, i) => (
              <option key={it.slug} value={i}>
                {it.nom} ({it.code_dep}){" "}
                {it.hasValidatedPhoto
                  ? `✓${(it.validatedPhotoCount ?? 1) > 1 ? `×${it.validatedPhotoCount}` : ""}`
                  : it.validationStatus === "none_suitable_yet"
                    ? "?"
                    : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[#333]">
          Largeur min. (px)
          <select
            value={minWidth}
            onChange={(e) => setMinWidth(Number(e.target.value))}
            className="mt-1 block rounded border border-[#A55734]/30 px-2 py-1.5 text-sm"
          >
            <option value={400}>400 (souple)</option>
            <option value={800}>800 (défaut)</option>
            <option value={1000}>1000 (strict)</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="rounded border border-[#A55734]/30 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Précédent
          </button>
          <button
            type="button"
            disabled={index >= items.length - 1}
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            className="rounded border border-[#A55734]/30 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      </div>

      {current && (
        <div className="rounded-lg border border-[#E07856]/25 bg-[#FFF8F0]/80 px-3 py-2 text-xs text-[#333]">
          <strong>{current.nom}</strong> · {current.departement} · {current.categorie_taille} · esth.{" "}
          {current.score_esthetique} · <span className="text-[#A55734]">{current.raison}</span>
          {(current.validatedPhotoCount ?? 0) > 0 && (
            <span className="ml-2 font-medium text-green-800">
              · {current.validatedPhotoCount} photo(s) déjà validée(s)
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loadingPhotos && <p className="text-sm text-[#333]/70">Chargement Commons…</p>}

      {data && !loadingPhotos && (
        <>
          <p className="text-xs text-[#333]/70">
            Requête : <code className="rounded bg-white px-1">{data.query}</code> · {data.totalCandidates}{" "}
            candidat(s) après filtres · API {data.fetchMs} ms · offset {offset}
          </p>

          {data.photos.length === 0 ? (
            <p className="text-sm text-amber-800">
              Aucune image ne passe les critères (largeur min. {minWidth}px). Baisse le seuil ou change de lieu.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {data.photos.map((p) => {
                const already = current?.validatedUrls?.includes(p.url) ?? false;
                return (
                  <div
                    key={p.url}
                    className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
                      already ? "border-green-600/40 ring-1 ring-green-600/20" : "border-[#A55734]/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    <div className="space-y-1 p-2 text-[10px] leading-snug text-[#333]/80">
                      <p className="line-clamp-2 font-medium">{p.title}</p>
                      <p>
                        {p.width}×{p.height} · {p.author}
                      </p>
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#A55734] underline"
                      >
                        Commons
                      </a>
                    </div>
                    {already ? (
                      <button
                        type="button"
                        onClick={() => void postValidation("unvalidate", p)}
                        className="mt-auto border border-red-700/40 bg-red-50 py-2 text-xs font-bold text-red-900 hover:bg-red-100"
                      >
                        Retirer la validation
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void postValidation("validate", p)}
                        className="mt-auto bg-[#E07856] py-2 text-xs font-bold text-white hover:opacity-95"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#A55734]/15 pt-4">
            <button
              type="button"
              disabled={!data.hasMore}
              onClick={() => void postValidation("reject_batch")}
              className="rounded-lg border-2 border-amber-600/50 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-40"
            >
              Aucune ne convient — afficher {data.windowSize} autres
            </button>
            {!data.hasMore && data.totalCandidates > 0 && (
              <span className="self-center text-xs text-[#333]/60">Fin des candidats pour cette requête.</span>
            )}
            <button
              type="button"
              onClick={() => void postValidation("skip")}
              className="rounded-lg border border-[#333]/20 px-4 py-2 text-sm text-[#333]/80"
            >
              Passer ce lieu (sans photo)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
