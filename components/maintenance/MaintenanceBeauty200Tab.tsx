"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveMaintenanceQueueIndex,
  persistMaintenanceResumeSlug,
  persistMaintenanceLastValidatedSlug,
  readBeautyQueueScope,
  persistBeautyQueueScope,
  type BeautyQueueScopeId,
} from "@/lib/maintenance-ui-persist";

type Photo = {
  url: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
};

type CurationStats = {
  photosSurSite: number;
  lieuxAvecSelection: number;
  totalUnsplashValidated: number;
  totalCommonsValidated: number;
};

type QueueItem = {
  slug: string;
  nom: string;
  rank: number;
  departement: string;
  code_dep: string;
  categorie_taille: string;
  score_esthetique: number;
  /** Absent si ancienne réponse API ; on retombe sur `score_esthetique`. */
  score_esthetique_fiche?: number;
  population: number;
  /** Plus Beaux Villages de France (fiche). */
  is_pbvf?: boolean;
  skipped: boolean;
  unsplashValidatedCount: number;
  commonsValidatedCount: number;
  unsplashPassedToCommons: boolean;
  defaultPhase: "unsplash" | "commons";
  validatedUnsplashUrls: string[];
  validatedCommonsUrls: string[];
};

export default function MaintenanceBeauty200Tab() {
  const [queueScope, setQueueScope] = useState<BeautyQueueScopeId>("top200");
  const [scopeReady, setScopeReady] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [curationStats, setCurationStats] = useState<CurationStats | null>(null);
  const [draftScore, setDraftScore] = useState(0);
  const [savingScore, setSavingScore] = useState(false);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  /** null = suivre le défaut serveur pour ce lieu */
  const [phaseOverride, setPhaseOverride] = useState<"unsplash" | "commons" | null>(null);
  const [minWidth, setMinWidth] = useState(800);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    photos: Photo[];
    query: string;
    totalCandidates: number;
    hasMore: boolean;
    fetchMs: number;
    nom: string;
    windowSize: number;
  } | null>(null);

  const loadQueue = useCallback(
    (opts?: { silent?: boolean; keepSlug?: string; preserveListIndex?: number }) => {
    const silent = opts?.silent === true;
    const keepSlug = opts?.keepSlug?.trim().toLowerCase();
    const preserveIdx = opts?.preserveListIndex;
    if (!silent) setLoadingList(true);
    const scopeParam =
      queueScope === "pbvf" ? "pbvf" : queueScope === "all" ? "all" : "top200";
    fetch(`/api/maintenance/beauty-queue?scope=${scopeParam}`)
      .then((r) => r.json())
      .then((j) => {
        const next: QueueItem[] = j.items ?? [];
        setItems(next);
        setCurationStats((j.stats as CurationStats | undefined) ?? null);
        if (typeof preserveIdx === "number" && Number.isFinite(preserveIdx)) {
          const clamped = Math.min(Math.max(0, Math.floor(preserveIdx)), Math.max(0, next.length - 1));
          setIndex(clamped);
        } else if (keepSlug) {
          const i = next.findIndex((it) => it.slug === keepSlug);
          if (i >= 0) setIndex(i);
        }
        setError(null);
      })
      .catch(() => {
        if (!silent) setError("Impossible de charger la file");
      })
      .finally(() => {
        if (!silent) setLoadingList(false);
      });
    },
    [queueScope]
  );

  useEffect(() => {
    setQueueScope(readBeautyQueueScope());
    setScopeReady(true);
  }, []);

  useEffect(() => {
    if (!scopeReady) return;
    loadQueue();
  }, [scopeReady, loadQueue]);

  const restoredRef = useRef(false);
  useEffect(() => {
    restoredRef.current = false;
  }, [queueScope]);

  useEffect(() => {
    if (loadingList || items.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const i = resolveMaintenanceQueueIndex(items, "beauty");
    if (i > 0) setIndex(i);
  }, [loadingList, items, queueScope]);

  const current = items[index];
  const wikiOnlyScope = queueScope === "all";
  const phase = wikiOnlyScope
    ? "commons"
    : (phaseOverride ?? current?.defaultPhase ?? "unsplash");

  useEffect(() => {
    if (current) setDraftScore(current.score_esthetique);
  }, [current?.slug, current?.score_esthetique]);

  useEffect(() => {
    const s = items[index]?.slug;
    if (s && !loadingList) persistMaintenanceResumeSlug("beauty", s);
  }, [items, index, loadingList]);

  useEffect(() => {
    setPhaseOverride(null);
    setOffset(0);
  }, [index]);

  useEffect(() => {
    setOffset(0);
  }, [minWidth]);

  useEffect(() => {
    if (!current?.slug) {
      setData(null);
      setLoadingPhotos(false);
      return;
    }

    const slugRequested = current.slug;
    const nomFallback = current.nom;

    setLoadingPhotos(true);
    setError(null);
    const beautyMode =
      queueScope === "all"
        ? "beauty_all"
        : queueScope === "pbvf"
          ? "beauty_pbvf"
          : "beauty_top200";
    const url =
      phase === "unsplash"
        ? `/api/maintenance/beauty-unsplash-candidates?slug=${encodeURIComponent(slugRequested)}&offset=${offset}`
        : `/api/maintenance/photo-candidates?slug=${encodeURIComponent(slugRequested)}&offset=${offset}&minWidth=${minWidth}&mode=${beautyMode}`;

    let obsolete = false;

    fetch(url)
      .then((r) => (r.ok ? r.json() : r.json().then((x) => Promise.reject(x.error ?? r.status))))
      .then((j) => {
        if (obsolete) return;
        setData({
          photos: j.photos ?? [],
          query: j.query ?? "",
          totalCandidates: j.totalCandidates ?? 0,
          hasMore: j.hasMore ?? false,
          fetchMs: j.fetchMs ?? 0,
          nom: j.nom ?? nomFallback,
          windowSize: typeof j.windowSize === "number" ? j.windowSize : 5,
        });
      })
      .catch((e) => {
        if (obsolete) return;
        setError(String(e));
      })
      .finally(() => {
        if (!obsolete) setLoadingPhotos(false);
      });

    return () => {
      obsolete = true;
    };
  }, [current?.slug, current?.nom, offset, minWidth, phase, queueScope]);

  async function postBeauty(
    action: string,
    photo?: Photo,
    extra?: { passToCommons?: boolean }
  ) {
    if (!current) return;
    if (extra?.passToCommons) {
      const res = await fetch("/api/maintenance/beauty-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: current.slug, action: "pass_to_commons" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Erreur");
        return;
      }
      setError(null);
      setPhaseOverride("commons");
      setOffset(0);
      loadQueue({ silent: true, keepSlug: current.slug });
      return;
    }

    const res = await fetch("/api/maintenance/beauty-validation", {
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
    if (action === "validate_unsplash" || action === "validate_commons") {
      persistMaintenanceLastValidatedSlug("beauty", current.slug);
    }

    const isValUnsplash = action === "validate_unsplash";
    const isUnUnsplash = action === "unvalidate_unsplash";
    const isValCommons = action === "validate_commons";
    const isUnCommons = action === "unvalidate_commons";

    if (photo && (isValUnsplash || isUnUnsplash || isValCommons || isUnCommons)) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.slug !== current.slug) return it;
          if (isValUnsplash) {
            const u = [...(it.validatedUnsplashUrls ?? [])];
            if (!u.includes(photo.url)) u.push(photo.url);
            return {
              ...it,
              validatedUnsplashUrls: u,
              unsplashValidatedCount: u.length,
            };
          }
          if (isUnUnsplash) {
            const u = (it.validatedUnsplashUrls ?? []).filter((x) => x !== photo.url);
            return {
              ...it,
              validatedUnsplashUrls: u,
              unsplashValidatedCount: u.length,
            };
          }
          if (isValCommons) {
            const u = [...(it.validatedCommonsUrls ?? [])];
            if (!u.includes(photo.url)) u.push(photo.url);
            return {
              ...it,
              validatedCommonsUrls: u,
              commonsValidatedCount: u.length,
            };
          }
          if (isUnCommons) {
            const u = (it.validatedCommonsUrls ?? []).filter((x) => x !== photo.url);
            return {
              ...it,
              validatedCommonsUrls: u,
              commonsValidatedCount: u.length,
            };
          }
          return it;
        })
      );
    }

    loadQueue({ silent: true, keepSlug: current.slug });

    if (action === "skip") {
      if (index < items.length - 1) setIndex((i) => i + 1);
    }
    if (action === "reject_unsplash" || action === "reject_commons") {
      const step = data?.windowSize ?? 5;
      setOffset((o) => o + step);
    }
  }

  async function applyDraftScore() {
    if (!current) return;
    setSavingScore(true);
    setError(null);
    try {
      const res = await fetch("/api/maintenance/beauty-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: current.slug,
          action: "set_score_esthetique",
          score: draftScore,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Impossible d’enregistrer la note");
        return;
      }
      await loadQueue({ silent: true, preserveListIndex: index });
    } finally {
      setSavingScore(false);
    }
  }

  async function resetScoreToFiche() {
    if (!current) return;
    setSavingScore(true);
    setError(null);
    try {
      const res = await fetch("/api/maintenance/beauty-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: current.slug, action: "clear_score_esthetique" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Impossible de rétablir la note");
        return;
      }
      await loadQueue({ silent: true, preserveListIndex: index });
    } finally {
      setSavingScore(false);
    }
  }

  const ficheScore = current ? (current.score_esthetique_fiche ?? current.score_esthetique) : 0;
  const noteCorrigee = current != null && current.score_esthetique !== ficheScore;

  function changeQueueScope(next: BeautyQueueScopeId) {
    persistBeautyQueueScope(next);
    setQueueScope(next);
    setIndex(0);
    setPhaseOverride(null);
    setOffset(0);
  }

  if (!scopeReady || loadingList) {
    return <p className="text-sm text-[#333]/70">Chargement de la file…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        Aucun lieu (vérifie <code className="rounded bg-[#FFF2EB] px-1">data/cities/lieux-central.json</code>).
      </p>
    );
  }

  const validatedUrls =
    phase === "unsplash" ? current?.validatedUnsplashUrls ?? [] : current?.validatedCommonsUrls ?? [];
  const validateAction = phase === "unsplash" ? "validate_unsplash" : "validate_commons";
  const unvalidateAction = phase === "unsplash" ? "unvalidate_unsplash" : "unvalidate_commons";
  const rejectAction = phase === "unsplash" ? "reject_unsplash" : "reject_commons";

  return (
    <div className="space-y-4">
      {curationStats && (
        <div className="rounded-xl border border-[var(--color-accent-end)]/25 bg-[#FFFCF9] px-4 py-3 text-sm text-[#333] shadow-sm">
          <p className="font-medium text-[var(--color-accent-end)]">Sélections enregistrées (fichier validations)</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-[#333]/90">
            <li>
              <strong>{curationStats.photosSurSite}</strong> image(s) utilisée(s) sur le site sur{" "}
              <strong>{curationStats.lieuxAvecSelection}</strong> lieu(x) (priorité Unsplash, sinon Commons).
            </li>
            <li>
              Saisies brutes : <strong>{curationStats.totalUnsplashValidated}</strong> Unsplash ·{" "}
              <strong>{curationStats.totalCommonsValidated}</strong> Commons.
            </li>
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-accent-end)]/20 bg-white p-2">
        <button
          type="button"
          onClick={() => changeQueueScope("top200")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            queueScope === "top200" ? "bg-[var(--color-accent-end)] text-white" : "bg-[#FFF2EB]/80 text-[#333]"
          }`}
        >
          File · Top 200 patrimoine
        </button>
        <button
          type="button"
          onClick={() => changeQueueScope("pbvf")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            queueScope === "pbvf" ? "bg-[var(--color-accent-end)] text-white" : "bg-[#FFF2EB]/80 text-[#333]"
          }`}
        >
          File · Tous les PBVF
        </button>
        <button
          type="button"
          onClick={() => changeQueueScope("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            queueScope === "all" ? "bg-[var(--color-accent-end)] text-white" : "bg-[#FFF2EB]/80 text-[#333]"
          }`}
        >
          File · Tout le patrimoine
        </button>
      </div>

      {current && (
        <div className="rounded-xl border-2 border-[var(--color-accent-start)]/35 bg-white px-4 py-3 shadow-sm">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#333]">
            Note esthétique (
            {queueScope === "all" ? "tout patrimoine" : queueScope === "pbvf" ? "file PBVF" : "top 200"})
            {current.is_pbvf ? (
              <span className="rounded-full border border-amber-600/35 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                PBVF
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[#333]/80">
            La liste est re-triée automatiquement après enregistrement. Note fiche JSON (lieux-central) :{" "}
            <strong>{ficheScore}</strong>
            {noteCorrigee ? (
              <>
                {" "}
                · <span className="text-amber-900">correction maintenance : {current.score_esthetique}</span>
              </>
            ) : null}
            . Si la note baisse beaucoup, le lieu peut sortir du top 200.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-[#333]">
              Nouvelle note (0–10)
              <select
                value={draftScore}
                disabled={savingScore}
                onChange={(e) => setDraftScore(Number(e.target.value))}
                className="rounded border border-[var(--color-accent-end)]/40 px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={savingScore || draftScore === current.score_esthetique}
              onClick={() => void applyDraftScore()}
              className="rounded-lg bg-[var(--color-accent-end)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {savingScore ? "…" : "Enregistrer & recalculer le tri"}
            </button>
            {noteCorrigee && (
              <button
                type="button"
                disabled={savingScore}
                onClick={() => void resetScoreToFiche()}
                className="rounded-lg border border-[#333]/25 px-3 py-2 text-sm text-[#333]/85"
              >
                Rétablir la note fiche ({ficheScore})
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-[#333]/85">
        {queueScope === "top200" ? (
          <>
            <strong>Top {items.length} lieux</strong> patrimoine (tri note esthétique puis population). Les{" "}
            <strong>PBVF</strong> ont une note fiche d’au moins <strong>9/10</strong>. Pour poursuivre les villages
            labellisés qui ne sont pas dans ce top, passe à la file <strong>« Tous les PBVF »</strong> ci-dessus.
          </>
        ) : queueScope === "pbvf" ? (
          <>
            <strong>{items.length} Plus Beaux Villages de France</strong> (patrimoine), même tri global — pour traiter
            ceux qui sortent du top 200. Les validations vont au <strong>même fichier</strong> : le site les utilise
            dès qu’un slug a des photos enregistrées.
          </>
        ) : (
          <>
            <strong>{items.length} lieux patrimoine</strong> (lieux-central), tri note puis population. Idéal pour les
            communes plus confidentielles : on ne propose que <strong>Wikimedia Commons</strong> (pas Unsplash). Même
            fichier de validations et mêmes notes que les autres files.
          </>
        )}{" "}
        {!wikiOnlyScope ? (
          <>
            D’abord <strong>Unsplash</strong>, puis <strong>Wikimedia</strong> si besoin.{" "}
          </>
        ) : null}
        Position mémorisée sur cet appareil. Fichier :{" "}
        <code className="rounded bg-[#FFF2EB] px-1 text-xs">data/maintenance/beauty-200-validations.json</code>.
      </p>
      <p className="text-xs text-[#333]/75">
        Sur le site : si au moins une photo Unsplash est validée, elle est utilisée ; sinon les validations Commons.
      </p>

      {!wikiOnlyScope ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-accent-end)]/20 bg-white p-2">
          <button
            type="button"
            onClick={() => {
              setPhaseOverride("unsplash");
              setOffset(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              phase === "unsplash" ? "bg-[var(--color-accent-end)] text-white" : "bg-[#FFF2EB]/80 text-[#333]"
            }`}
          >
            1 · Unsplash
          </button>
          <button
            type="button"
            onClick={() => {
              setPhaseOverride("commons");
              setOffset(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              phase === "commons" ? "bg-[var(--color-accent-end)] text-white" : "bg-[#FFF2EB]/80 text-[#333]"
            }`}
          >
            2 · Wikimedia
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--color-accent-end)]/20 bg-[#FFFCF9] px-3 py-2 text-sm text-[#333]/90">
          Cette file utilise uniquement <strong>Wikimedia Commons</strong> (recherche + filtres largeur).
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-accent-end)]/20 bg-white p-3">
        <label className="text-xs font-medium text-[#333]">
          Lieu (#{current?.rank} · {index + 1} / {items.length})
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mt-1 block w-full min-w-[240px] rounded border border-[var(--color-accent-end)]/30 px-2 py-1.5 text-sm"
          >
            {items.map((it, i) => (
              <option key={it.slug} value={i}>
                {it.rank}. {it.is_pbvf ? "[PBVF] " : ""}
                {it.nom} ({it.code_dep}) esth.{it.score_esthetique}
                {it.skipped
                  ? " ⊗"
                  : it.unsplashValidatedCount
                    ? ` U×${it.unsplashValidatedCount}`
                    : ""}
                {it.commonsValidatedCount ? ` C×${it.commonsValidatedCount}` : ""}
              </option>
            ))}
          </select>
        </label>
        {phase === "commons" && (
          <label className="text-xs font-medium text-[#333]">
            Largeur min. (px)
            <select
              value={minWidth}
              onChange={(e) => setMinWidth(Number(e.target.value))}
              className="mt-1 block rounded border border-[var(--color-accent-end)]/30 px-2 py-1.5 text-sm"
            >
              <option value={400}>400</option>
              <option value={800}>800</option>
              <option value={1000}>1000</option>
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="rounded border border-[var(--color-accent-end)]/30 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Précédent
          </button>
          <button
            type="button"
            disabled={index >= items.length - 1}
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            className="rounded border border-[var(--color-accent-end)]/30 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      </div>

      {current && (
        <div className="rounded-lg border border-[var(--color-accent-start)]/25 bg-[#FFF8F0]/80 px-3 py-2 text-xs text-[#333]">
          <strong>{current.nom}</strong>
          {current.is_pbvf ? (
            <span
              className="ml-2 inline-flex align-middle items-center rounded-full border border-amber-600/35 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950"
              title="Plus Beaux Villages de France — note fiche ≥ 9/10"
            >
              PBVF
            </span>
          ) : null}{" "}
          · rang {current.rank} · {current.departement} · esth. {current.score_esthetique} · pop.{" "}
          {current.population.toLocaleString("fr-FR")}
          {current.unsplashValidatedCount > 0 && (
            <span className="ml-2 font-medium text-green-800">
              · {current.unsplashValidatedCount} Unsplash
            </span>
          )}
          {current.commonsValidatedCount > 0 && (
            <span className="ml-2 font-medium text-blue-900">
              · {current.commonsValidatedCount} Commons
            </span>
          )}
        </div>
      )}

      {phase === "unsplash" && !wikiOnlyScope && (
        <button
          type="button"
          onClick={() => void postBeauty("", undefined, { passToCommons: true })}
          className="w-full rounded-lg border-2 border-dashed border-[var(--color-accent-end)]/40 bg-[#FFFCF9] px-4 py-3 text-sm font-medium text-[var(--color-accent-end)] hover:bg-[#FFF2EB]"
        >
          Rien ne convient sur Unsplash → passer à Wikimedia (étape 2)
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loadingPhotos && (
        <p className="text-sm text-[#333]/70">
          Chargement {phase === "unsplash" ? "Unsplash" : "Commons"}…
        </p>
      )}

      {data && !loadingPhotos && (
        <>
          <p className="text-xs text-[#333]/70">
            Requête : <code className="rounded bg-white px-1">{data.query}</code> · {data.totalCandidates}{" "}
            résultat(s) · {data.fetchMs} ms · offset {offset}
          </p>

            {data.photos.length === 0 ? (
            <p className="text-sm text-amber-800">
              {phase === "commons"
                ? wikiOnlyScope
                  ? `Aucune image (largeur min. ${minWidth}px). Baisse le seuil.`
                  : `Aucune image (largeur min. ${minWidth}px). Baisse le seuil ou passe à Unsplash.`
                : "Aucun résultat Unsplash (clé API ou quota). Tu peux passer à Wikimedia."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {data.photos.map((p) => {
                const already = validatedUrls.includes(p.url);
                return (
                  <div
                    key={p.url}
                    className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
                      already ? "border-green-600/40 ring-1 ring-green-600/20" : "border-[var(--color-accent-end)]/20"
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
                        className="text-[var(--color-accent-end)] underline"
                      >
                        {phase === "unsplash" ? "Unsplash" : "Commons"}
                      </a>
                    </div>
                    {already ? (
                      <button
                        type="button"
                        onClick={() => void postBeauty(unvalidateAction, p)}
                        className="mt-auto border border-red-700/40 bg-red-50 py-2 text-xs font-bold text-red-900 hover:bg-red-100"
                      >
                        Retirer la validation
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void postBeauty(validateAction, p)}
                        className="mt-auto bg-[var(--color-accent-start)] py-2 text-xs font-bold text-white hover:opacity-95"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[var(--color-accent-end)]/15 pt-4">
            <button
              type="button"
              disabled={!data.hasMore}
              onClick={() => void postBeauty(rejectAction)}
              className="rounded-lg border-2 border-amber-600/50 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-40"
            >
              Aucune ne convient — {data.windowSize} autres
            </button>
            {!data.hasMore && data.totalCandidates > 0 && (
              <span className="self-center text-xs text-[#333]/60">Fin des candidats.</span>
            )}
            <button
              type="button"
              onClick={() => void postBeauty("skip")}
              className="rounded-lg border border-[#333]/20 px-4 py-2 text-sm text-[#333]/80"
            >
              Ignorer ce lieu
            </button>
          </div>
        </>
      )}
    </div>
  );
}
