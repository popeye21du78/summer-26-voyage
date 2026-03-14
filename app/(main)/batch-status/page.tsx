"use client";

import { useState, useCallback, useEffect } from "react";
import {
  RefreshCw,
  Loader2,
  Download,
  Send,
  ExternalLink,
  CheckCircle2,
  Circle,
  Play,
  Package,
  FileText,
  FolderOpen,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Camera,
} from "lucide-react";

/* ──────────── Types ──────────── */

type LotStatus = {
  lot: number;
  id: string;
  label: string;
  requests: number;
  batchId: string | null;
  status: string;
  completed?: number;
  total?: number;
  failed?: number;
  hasOutput: boolean;
};

type DescStatus = {
  prepared: boolean;
  lots: LotStatus[];
  summary?: {
    totalLots: number;
    totalRequests: number;
    submittedLots: number;
    completedLots: number;
    downloadedLots: number;
    completedRequests: number;
  };
  cost?: { estimated: number; spent: number };
  descriptions?: { total: number; raw: number; fixed: number };
  processing?: Record<string, unknown> | null;
};

/* ──────────── Helpers ──────────── */

const statusLabel: Record<string, string> = {
  not_submitted: "À soumettre",
  validating: "Validation…",
  in_progress: "En cours…",
  finalizing: "Finalisation…",
  completed: "Terminé",
  failed: "Échec",
  expired: "Expiré",
  submitted: "Soumis",
  unknown: "Inconnu",
};

const statusColor: Record<string, string> = {
  not_submitted: "text-[#333]/50",
  completed: "text-green-600",
  in_progress: "text-amber-600",
  validating: "text-amber-600",
  finalizing: "text-amber-600",
  submitted: "text-amber-600",
  failed: "text-red-600",
  expired: "text-red-600",
};

const statusBg: Record<string, string> = {
  not_submitted: "bg-gray-50 border-gray-200",
  completed: "bg-green-50/50 border-green-200",
  in_progress: "bg-amber-50/50 border-amber-200",
  validating: "bg-amber-50/50 border-amber-200",
  finalizing: "bg-amber-50/50 border-amber-200",
  submitted: "bg-amber-50/50 border-amber-200",
  failed: "bg-red-50/50 border-red-200",
  expired: "bg-red-50/50 border-red-200",
};

/* ──────────── Component ──────────── */

export default function BatchStatusPage() {
  const [data, setData] = useState<DescStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [expandedOutput, setExpandedOutput] = useState(false);
  const [photosBatchStatus, setPhotosBatchStatus] = useState<{ total: number; done: number; remaining: number } | null>(null);

  const fetchStatus = useCallback(async (light = false) => {
    setLoading(true);
    setError(null);
    const timeoutMs = light ? 15_000 : 180_000;
    try {
      const url = light ? "/api/batch-desc-status?light=1" : "/api/batch-desc-status";
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      if (!text?.trim()) throw new Error("Réponse vide de l'API");
      let parsed: DescStatus;
      try {
        parsed = JSON.parse(text) as DescStatus;
      } catch {
        throw new Error(
          "Réponse invalide (JSON tronqué). L'API a peut‑être mis trop de temps. Réessaie dans quelques secondes."
        );
      }
      setData(parsed);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.name === "AbortError"
            ? `Délai dépassé (${timeoutMs / 1000}s). L'API est lente, réessaie. Les lots continuent sur OpenAI.`
            : e.message
          : String(e);
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  const fetchPhotosBatchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/photos-commons-batch");
      if (res.ok) {
        const text = await res.text();
        const data = text?.trim() ? (JSON.parse(text) as { total?: number; done?: number; remaining?: number }) : {};
        setPhotosBatchStatus({ total: data.total ?? 0, done: data.done ?? 0, remaining: data.remaining ?? 0 });
      }
    } catch {
      setPhotosBatchStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchPhotosBatchStatus();
  }, [fetchPhotosBatchStatus, actionOutput]);

  async function runPhotosBatch(count: number) {
    setActionLoading(`photos-batch-${count}`);
    setActionOutput(null);
    setExpandedOutput(true);
    try {
      const res = await fetch(`/api/photos-commons-batch?count=${count}`, { method: "POST" });
      const text = await res.text();
      const data = text?.trim() ? (JSON.parse(text) as { error?: string; message?: string; processed?: number; remaining?: number }) : {};
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setActionOutput(data.message ?? `${data.processed} traités, ${data.remaining} restants`);
      await fetchPhotosBatchStatus();
    } catch (e) {
      setActionOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }

  // Rafraîchir (sans light) = appel OpenAI pour statut en temps réel. Uniquement au clic ou après soumission.

  async function callApi(url: string, key: string) {
    setActionLoading(key);
    setActionOutput(null);
    setExpandedOutput(true);
    try {
      const res = await fetch(url, { method: "POST" });
      const text = await res.text();
      let json: { error?: string; output?: string };
      try {
        json = text?.trim() ? (JSON.parse(text) as { error?: string; output?: string }) : {};
      } catch {
        throw new Error(text || "Réponse invalide");
      }
      if (!res.ok) throw new Error(json.error || text || "Erreur");
      setActionOutput(json.output ?? "OK");
      await fetchStatus(false);
    } catch (e) {
      setActionOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }

  const lots = data?.lots ?? [];
  const summary = data?.summary;
  const cost = data?.cost;
  const descs = data?.descriptions;

  const anyFailed = lots.some((l) => ["failed", "expired"].includes(l.status));
  const anyRunning = lots.some((l) =>
    ["in_progress", "validating", "finalizing", "submitted"].includes(l.status)
  );
  const failedLots = lots.filter((l) => ["failed", "expired"].includes(l.status));

  // Only suggest next lot if all previous lots are completed (not failed)
  const nextToSubmit = (() => {
    if (anyFailed || anyRunning) return null;
    for (const l of lots) {
      if (l.status === "not_submitted") {
        const prev = lots.find((p) => p.lot === l.lot - 1);
        if (!prev || prev.status === "completed") return l;
        return null;
      }
    }
    return null;
  })();

  const completedNotDownloaded = lots.filter(
    (l) => l.status === "completed" && !l.hasOutput
  );
  const allDownloaded = lots.length > 0 && lots.every((l) => l.hasOutput);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-2 flex items-center gap-3">
        <Package className="h-6 w-6 text-[#A55734]" />
        <h1 className="text-2xl font-light text-[#333]">
          Batch Descriptions
        </h1>
      </div>
      <p className="mb-6 text-sm text-[#333]/70">
        Phase 2 — Génération des {summary?.totalRequests?.toLocaleString() ?? "2 066"} descriptions
        via le Batch API OpenAI (gpt-4.1, -50% coût, ~24h par lot).
      </p>
      {loading && !data && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2 text-sm text-amber-800">
          Chargement des lots…
        </p>
      )}
      {!loading && !data && !error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2 text-sm text-amber-800">
          Aucune donnée. Cliquez sur <strong>Rafraîchir</strong> pour charger.
        </p>
      )}
      {data && (
        <p className="mb-4 rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 px-4 py-2 text-sm text-[#333]/80">
          Chargement depuis les fichiers (aucun appel OpenAI). <strong>Rafraîchir</strong> = statut en temps réel.
        </p>
      )}

      {/* ── Actions bar ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fetchStatus(false)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A55734]/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rafraîchir
        </button>

        {!data?.prepared && (
          <button
            type="button"
            onClick={() => callApi("/api/batch-desc-prepare?model=gpt-4.1", "prepare")}
            disabled={!!actionLoading}
            className="flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8B6914]/90 disabled:opacity-60"
          >
            {actionLoading === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Préparer les JSONL
          </button>
        )}

        {data?.prepared && !anyRunning && nextToSubmit && (
          <button
            type="button"
            onClick={() =>
              callApi(`/api/batch-desc-submit?lot=${nextToSubmit.lot}`, `submit-${nextToSubmit.lot}`)
            }
            disabled={!!actionLoading}
            className="flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8B6914]/90 disabled:opacity-60"
          >
            {actionLoading === `submit-${nextToSubmit.lot}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Soumettre lot {nextToSubmit.lot} — {nextToSubmit.label}
          </button>
        )}

        {anyRunning && (
          <span className="flex items-center gap-2 text-sm text-amber-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lot en cours — cliquez sur Rafraîchir pour voir l&apos;avancement
          </span>
        )}
      </div>

      {/* ── Failed lots warning ── */}
      {failedLots.length > 0 && (
        <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 font-medium text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {failedLots.length} lot(s) en échec
          </div>
          <p className="mt-1 text-sm text-red-600">
            Corrige le problème puis re-prépare les JSONL et re-soumets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => callApi("/api/batch-desc-prepare?model=gpt-4.1", "prepare")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-60"
            >
              {actionLoading === "prepare" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Re-préparer les JSONL
            </button>
            {failedLots.map((fl) => (
              <button
                key={fl.lot}
                type="button"
                onClick={() =>
                  callApi(`/api/batch-desc-submit?lot=${fl.lot}`, `submit-${fl.lot}`)
                }
                disabled={!!actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading === `submit-${fl.lot}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Re-soumettre lot {fl.lot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Action output ── */}
      {actionOutput && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setExpandedOutput(!expandedOutput)}
            className="mb-1 flex items-center gap-1 text-xs font-medium text-[#333]/60 hover:text-[#333]"
          >
            {expandedOutput ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Sortie console
          </button>
          {expandedOutput && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/50 p-3 text-xs text-[#333]">
              {actionOutput}
            </pre>
          )}
        </div>
      )}

      {/* ── Cost + progress summary ── */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-3 text-center">
            <div className="text-2xl font-light text-[#333]">
              {summary.completedLots}/{summary.totalLots}
            </div>
            <div className="text-xs text-[#333]/60">Lots terminés</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-3 text-center">
            <div className="text-2xl font-light text-[#333]">
              {summary.completedRequests.toLocaleString()}/{summary.totalRequests.toLocaleString()}
            </div>
            <div className="text-xs text-[#333]/60">Descriptions générées</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-3 text-center">
            <div className="text-2xl font-light text-[#A55734]">
              ~${cost?.spent?.toFixed(2) ?? "0"}
            </div>
            <div className="text-xs text-[#333]/60">
              Dépensé / ~${cost?.estimated?.toFixed(2) ?? "?"} estimé
            </div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-3 text-center">
            <div className="text-2xl font-light text-[#333]">
              {descs?.fixed ?? 0}
            </div>
            <div className="text-xs text-[#333]/60">
              Validées / {descs?.total ?? 0} total
            </div>
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      {summary && summary.totalRequests > 0 && (
        <div className="mb-8">
          <div className="mb-1 flex justify-between text-xs text-[#333]/60">
            <span>Progression globale</span>
            <span>
              {Math.round((summary.completedRequests / summary.totalRequests) * 100)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#A55734] to-[#C97B5A] transition-all duration-500"
              style={{
                width: `${(summary.completedRequests / summary.totalRequests) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Lots grid ── */}
      {lots.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-[#333]">
            Lots ({lots.length})
          </h2>
          <div className="space-y-2">
            {lots.map((l) => {
              const bg = statusBg[l.status] ?? "bg-white border-gray-200";
              const color = statusColor[l.status] ?? "text-[#333]/60";
              const pct =
                l.total && l.total > 0
                  ? Math.round(((l.completed ?? 0) / l.total) * 100)
                  : 0;

              return (
                <div
                  key={l.lot}
                  className={`rounded-lg border p-4 ${bg}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">
                        {l.lot}
                      </span>
                      <div>
                        <span className="font-medium text-[#333]">
                          {l.label}
                        </span>
                        <span className={`ml-2 text-sm ${color}`}>
                          {statusLabel[l.status] ?? l.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {l.total != null && l.status !== "not_submitted" && (
                        <span className="text-sm text-[#333]/60">
                          {l.completed ?? 0}/{l.total}
                          {l.failed ? (
                            <span className="ml-1 text-red-500">
                              ({l.failed} échecs)
                            </span>
                          ) : null}
                        </span>
                      )}

                      {l.status === "not_submitted" && (
                        <span className="text-xs text-[#333]/40">
                          {l.requests} req.
                        </span>
                      )}

                      {l.status === "completed" && !l.hasOutput && (
                        <button
                          type="button"
                          onClick={() =>
                            callApi(
                              `/api/batch-desc-download?lot=${l.lot}`,
                              `dl-${l.lot}`
                            )
                          }
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-60"
                        >
                          {actionLoading === `dl-${l.lot}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          Télécharger
                        </button>
                      )}

                      {l.hasOutput && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Téléchargé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar per lot */}
                  {["in_progress", "validating", "finalizing"].includes(l.status) &&
                    l.total &&
                    l.total > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Post-batch pipeline ── */}
      {allDownloaded && (
        <section className="mb-8 rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-5">
          <h2 className="mb-4 text-lg font-medium text-[#333]">
            Pipeline post-batch
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {descs && descs.total > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333]/40" />
              )}
              <div className="flex-1">
                <span className="font-medium text-[#333]">
                  1. Éclater les résultats en fichiers
                </span>
                <p className="text-sm text-[#333]/70">
                  Chaque réponse → <code className="rounded bg-[#FFF2EB] px-1">descriptions/slug-raw.txt</code>
                  {descs && descs.total > 0 && (
                    <span className="ml-1 text-green-600">
                      ({descs.total} fichiers)
                    </span>
                  )}
                </p>
                {descs && descs.total === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      callApi("/api/batch-desc-process?lot=all", "process-eclate")
                    }
                    disabled={!!actionLoading}
                    className="mt-2 flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-3 py-1.5 text-sm font-medium text-[#A55734] hover:bg-[#FFF2EB] disabled:opacity-60"
                  >
                    {actionLoading === "process-eclate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Éclater tous les lots
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {descs && descs.fixed > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333]/40" />
              )}
              <div className="flex-1">
                <span className="font-medium text-[#333]">
                  2. Validation + auto-fix
                </span>
                <p className="text-sm text-[#333]/70">
                  Correction automatique des balises, puis signalement des erreurs complexes
                  {descs && descs.fixed > 0 && (
                    <span className="ml-1 text-green-600">
                      ({descs.fixed} validées)
                    </span>
                  )}
                </p>
                {descs && descs.total > 0 && descs.fixed === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      callApi(
                        "/api/batch-desc-process?lot=all&validate=true",
                        "process-validate"
                      )
                    }
                    disabled={!!actionLoading}
                    className="mt-2 flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-3 py-1.5 text-sm font-medium text-[#A55734] hover:bg-[#FFF2EB] disabled:opacity-60"
                  >
                    {actionLoading === "process-validate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Valider + auto-fix
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333]/40" />
              <div className="flex-1">
                <span className="font-medium text-[#333]">
                  3. Dossiers photos
                </span>
                <p className="text-sm text-[#333]/70">
                  Créer l&apos;arborescence <code className="rounded bg-[#FFF2EB] px-1">photos/</code> depuis les tags PHOTOS + MANGER
                </p>
                {descs && descs.total > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      callApi(
                        "/api/batch-desc-process?lot=all&photos=true",
                        "process-photos"
                      )
                    }
                    disabled={!!actionLoading}
                    className="mt-2 flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-3 py-1.5 text-sm font-medium text-[#A55734] hover:bg-[#FFF2EB] disabled:opacity-60"
                  >
                    {actionLoading === "process-photos" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderOpen className="h-4 w-4" />
                    )}
                    Créer dossiers photos
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Batch photos Wikimedia Commons ── */}
      <section className="mb-8 rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-[#333]">
          <Camera className="h-5 w-5 text-[#A55734]" />
          Batch photos Wikimedia Commons
        </h2>
        <p className="mb-4 text-sm text-[#333]/70">
          Remplit <code className="rounded bg-[#FFF2EB] px-1">photos/{`{slug}`}/commons-candidates.json</code> pour chaque lieu.
          API Commons (gratuit), ~1,2 s entre requêtes.
        </p>
        {photosBatchStatus && photosBatchStatus.total > 0 && (
          <p className="mb-4 text-sm font-medium text-[#333]">
            {photosBatchStatus.done} / {photosBatchStatus.total} lieux traités
            {photosBatchStatus.remaining > 0 && (
              <span className="ml-2 text-amber-600">({photosBatchStatus.remaining} restants)</span>
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runPhotosBatch(5)}
            disabled={!!actionLoading || (photosBatchStatus?.remaining ?? 0) === 0}
            className="flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-4 py-2 text-sm font-medium text-[#A55734] hover:bg-[#FFF2EB] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading?.startsWith("photos-batch") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Lancer 5 lieux
          </button>
          <button
            type="button"
            onClick={() => runPhotosBatch(20)}
            disabled={!!actionLoading || (photosBatchStatus?.remaining ?? 0) === 0}
            className="flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-4 py-2 text-sm font-medium text-[#A55734] hover:bg-[#FFF2EB] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading?.startsWith("photos-batch") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Lancer 20 lieux
          </button>
        </div>
        <p className="mt-3 text-xs text-[#333]/60">
          Pour tout traiter en arrière-plan :{" "}
          <code className="rounded bg-white px-1.5 py-0.5">npx tsx scripts/fetch-commons-photos-batch.ts</code>
        </p>
      </section>

      {/* ── Processing indicator ── */}
      {data?.processing && (
        <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <div className="flex items-center gap-2 font-medium text-amber-800">
            <Loader2 className="h-5 w-5 animate-spin" />
            Traitement en cours…
          </div>
          <pre className="mt-2 text-xs text-amber-900">
            {JSON.stringify(data.processing, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Cost card ── */}
      <section className="mb-8 rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-5">
        <h2 className="mb-3 text-lg font-medium text-[#333]">€ Suivi des coûts</h2>
        <div className="mb-3 space-y-1 text-sm text-[#333]/80">
          <p>
            Modèle : <strong>gpt-4.1</strong> — Batch API (-50%) — Fenêtre 24h
          </p>
          <p>
            Estimation totale : <strong>~${cost?.estimated?.toFixed(2) ?? "22–23"}</strong>
            {cost?.spent != null && cost.spent > 0 && (
              <> — Dépensé : <strong className="text-[#A55734]">~${cost.spent.toFixed(2)}</strong></>
            )}
          </p>
        </div>
        <a
          href="https://platform.openai.com/usage"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#A55734] shadow-sm transition hover:bg-[#FFF2EB]"
        >
          <ExternalLink className="h-4 w-4" />
          Voir les coûts réels sur OpenAI
        </a>
      </section>

      {/* ── How-to ── */}
      <section className="mb-6 rounded-lg border border-[#A55734]/10 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-[#333]">Mode d&apos;emploi</h2>
        <ol className="space-y-2 text-sm text-[#333]/80">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">1</span>
            <span><strong>Préparer</strong> — Génère les fichiers JSONL (1 clic, instantané)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">2</span>
            <span><strong>Soumettre lot par lot</strong> — Un clic par lot, attendre &quot;Terminé&quot; avant le suivant (~24h max)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">3</span>
            <span><strong>Télécharger</strong> — Quand un lot est terminé, clic &quot;Télécharger&quot;</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">4</span>
            <span><strong>Éclater + valider</strong> — Transforme les résultats en fichiers individuels, auto-fixe les erreurs</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A55734]/10 text-xs font-bold text-[#A55734]">5</span>
            <span><strong>Dossiers photos</strong> — Crée l&apos;arborescence pour tes photos</span>
          </li>
        </ol>
      </section>

      <p className="text-sm text-[#333]/50">
        Suivi détaillé :{" "}
        <a
          href="https://platform.openai.com/batches"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#A55734] underline hover:no-underline"
        >
          platform.openai.com/batches
        </a>
      </p>
    </main>
  );
}
