"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Download, Send, ExternalLink, CheckCircle2, Circle, Play } from "lucide-react";

type BatchInfo = {
  part: number;
  batch_id: string;
  status: string;
  completed?: number;
  total?: number;
  failed?: number;
};

type PipelineStatus = {
  process: {
    hasBatchOutput: boolean;
    batchOutputLines: number;
    hasExcel: boolean;
    excelStats: { patrimoine: number; plages: number; randos: number; hasLatLng: boolean };
    inProgress?: {
      current: number;
      total: number;
      lastDep: string;
      currentDep?: string;
      errors?: Array<{ dep: string; message: string }>;
    } | null;
  };
  enrich: {
    done: boolean;
    inProgress?: { sheet: string; current: number; total: number } | null;
  };
};

export default function BatchStatusPage() {
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/batch-status", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBatches(data.batches ?? []);
      setPipeline(data.pipeline ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBatches([]);
      setPipeline(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Rafraîchir automatiquement pendant process ou enrichissement
  const processInProgress = pipeline?.process.inProgress;
  const enrichInProgress = pipeline?.enrich.inProgress;
  useEffect(() => {
    if (!processInProgress && !enrichInProgress) return;
    const t = setInterval(fetchStatus, 3000);
    return () => clearInterval(t);
  }, [processInProgress, enrichInProgress, fetchStatus]);

  async function runEnrich() {
    setActionLoading("enrich-lieux");
    setActionOutput(null);
    try {
      const res = await fetch("/api/enrich-lieux", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setActionOutput(data.output ?? "OK");
      await fetchStatus();
    } catch (e) {
      setActionOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function runAction(
    api: "batch-download" | "batch-download-all" | "batch-submit",
    part?: number
  ) {
    const key = part ? `${api}-${part}` : api;
    setActionLoading(key);
    setActionOutput(null);
    try {
      const url = part
        ? `/api/${api}?part=${part}`
        : "/api/batch-download-all";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setActionOutput(data.output ?? "OK");
      await fetchStatus();
    } catch (e) {
      setActionOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }

  const statusColor = (s: string) => {
    if (s === "completed") return "text-green-600";
    if (s === "in_progress" || s === "validating" || s === "finalizing") return "text-amber-600";
    if (s === "failed" || s === "expired") return "text-red-600";
    return "text-[#333333]";
  };

  const allCompleted =
    batches.length === 4 && batches.every((b) => b.status === "completed");
  const allCurrentCompleted =
    batches.length > 0 && batches.every((b) => b.status === "completed");
  const nextPartToSubmit =
    batches.length === 0
      ? 1
      : allCurrentCompleted && batches.length < 4
        ? batches.length + 1
        : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">Avancement des batches</h1>
      <p className="mb-6 text-[#333333]/80">
        Suivi des lots Phase 1 (patrimoine + plages). ~2 min par lot. Rafraîchis pour mettre à jour.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A55734]/90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Rafraîchir
        </button>
        {allCurrentCompleted && batches.length < 4 && nextPartToSubmit && (
          <span className="text-sm text-amber-600">
            Lots 1–{batches.length} terminés — lance le suivant
          </span>
        )}
        {allCompleted && (
          <>
            <button
              type="button"
              onClick={() => runAction("batch-download-all")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-4 py-2 text-sm font-medium text-[#A55734] transition hover:bg-[#FFF2EB] disabled:opacity-60"
            >
              {actionLoading === "batch-download-all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger tout + fusionner
            </button>
            <span className="text-sm text-green-600">✓ Tous terminés — puis process + enrichissement</span>
          </>
        )}
        {nextPartToSubmit != null && nextPartToSubmit <= 4 && (
          <button
            type="button"
            onClick={() => runAction("batch-submit", nextPartToSubmit)}
            disabled={!!actionLoading}
            className="flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8B6914]/90 disabled:opacity-60"
          >
            {actionLoading === `batch-submit-${nextPartToSubmit}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Lancer lot {nextPartToSubmit}
          </button>
        )}
      </div>

      {(pipeline?.process.inProgress || pipeline?.enrich.inProgress) && (
        <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            Exécution en cours — rafraîchissement auto toutes les 3 s
          </div>
          {pipeline?.process.inProgress && (
            <div className="mt-2 space-y-1 text-sm text-amber-900">
              <p>
                <strong>Process :</strong> {pipeline.process.inProgress.current}/{pipeline.process.inProgress.total} départements
                {pipeline.process.inProgress.currentDep && (
                  <> — En cours sur <strong>{pipeline.process.inProgress.currentDep}</strong></>
                )}
              </p>
              {pipeline.process.inProgress.errors && pipeline.process.inProgress.errors.length > 0 && (
                <p className="text-red-700">
                  {pipeline.process.inProgress.errors.length} erreur(s) — voir détails ci-dessous
                </p>
              )}
            </div>
          )}
          {pipeline?.enrich.inProgress && (
            <p className="mt-2 text-sm text-amber-900">
              <strong>Enrichissement :</strong> {pipeline.enrich.inProgress.sheet} {pipeline.enrich.inProgress.current}/{pipeline.enrich.inProgress.total}
            </p>
          )}
        </div>
      )}

      {actionOutput && (
        <pre className="mb-6 max-h-40 overflow-auto rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/50 p-3 text-xs text-[#333333]">
          {actionOutput}
        </pre>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-[#333333]">Lots Phase 1</h2>
        {batches.length === 0 && !loading ? (
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-6 text-center text-[#333333]/70">
            Aucun batch. Clique « Lancer lot 1 » pour démarrer.
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div
                key={b.part}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#A55734]/20 bg-white p-4"
              >
                <div>
                  <span className="font-medium text-[#333333]">Lot {b.part}</span>
                  <span className={`ml-2 text-sm ${statusColor(b.status)}`}>
                    {b.status === "validating" && "Validation…"}
                    {b.status === "in_progress" && "En cours…"}
                    {b.status === "finalizing" && "Finalisation…"}
                    {b.status === "completed" && "Terminé"}
                    {b.status === "failed" && "Échec"}
                    {b.status === "expired" && "Expiré"}
                    {!["validating", "in_progress", "finalizing", "completed", "failed", "expired"].includes(b.status) && b.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {b.total != null && (
                    <span className="text-sm text-[#333333]/70">
                      {b.completed ?? 0}/{b.total} requêtes
                    </span>
                  )}
                  {b.status === "completed" && (
                    <button
                      type="button"
                      onClick={() => runAction("batch-download", b.part)}
                      disabled={!!actionLoading}
                      className="rounded bg-[#FFF2EB] px-2 py-1 text-xs text-[#A55734] hover:bg-[#FFF2EB]/80 disabled:opacity-60"
                    >
                      Télécharger
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10 rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-5">
        <h2 className="mb-3 text-lg font-medium text-[#333333]">€ Suivi des coûts</h2>
        <p className="mb-3 text-sm text-[#333333]/90">
          Consulte ta consommation réelle sur OpenAI :
        </p>
        <a
          href="https://platform.openai.com/usage"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#A55734] shadow-sm transition hover:bg-[#FFF2EB]"
        >
          <ExternalLink className="h-4 w-4" />
          Voir l&apos;usage et les coûts
        </a>
        <p className="mt-3 text-sm text-[#333333]/80">
          Phase 1 estimée : ~2–5 €. Top 100 + 1000 points : ~20–50 € total. Batch = -50 % vs sync.
        </p>
      </section>

      <section className="mb-10 rounded-lg border border-[#A55734]/20 bg-white p-5">
        <h2 className="mb-4 text-lg font-medium text-[#333333]">Pipeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {pipeline?.process.hasBatchOutput ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333333]/40" />
            )}
            <div>
              <span className="font-medium text-[#333333]">1. Batch Phase 1</span>
              <p className="text-sm text-[#333333]/80">
                Télécharger + fusionner → <code className="rounded bg-[#FFF2EB] px-1">batch_output.jsonl</code>
                {pipeline?.process.hasBatchOutput && ` (${pipeline.process.batchOutputLines} lignes)`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {pipeline?.process.hasExcel && pipeline.process.excelStats.patrimoine > 0 && !pipeline?.process.inProgress ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : pipeline?.process.inProgress ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333333]/40" />
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[#333333]">2. Process</span>
              {pipeline?.process.inProgress && (
                <div className="mt-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold text-amber-600">
                      {pipeline.process.inProgress.current}/{pipeline.process.inProgress.total} départements
                    </span>
                    {pipeline.process.inProgress.currentDep && (
                      <span className="text-sm text-[#333333]">
                        En cours : <strong>{pipeline.process.inProgress.currentDep}</strong>
                      </span>
                    )}
                    {pipeline.process.inProgress.lastDep && pipeline.process.inProgress.currentDep !== pipeline.process.inProgress.lastDep && (
                      <span className="text-xs text-[#333333]/70">
                        Dernier terminé : {pipeline.process.inProgress.lastDep}
                      </span>
                    )}
                  </div>
                  {pipeline.process.inProgress.errors && pipeline.process.inProgress.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700">
                        {pipeline.process.inProgress.errors.length} erreur(s) ou avertissement(s)
                      </summary>
                      <ul className="mt-1 max-h-32 overflow-y-auto rounded border border-red-200 bg-red-50/50 p-2 text-xs text-red-800">
                        {pipeline.process.inProgress.errors.map((e, i) => (
                          <li key={i} className="flex gap-2 py-0.5">
                            <span className="font-medium shrink-0">{e.dep}:</span>
                            <span>{e.message}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <p className="text-sm text-[#333333]/80">
                <code className="rounded bg-[#FFF2EB] px-1">npx tsx scripts/process-batch-results.ts</code>
                {pipeline?.process.hasExcel && pipeline.process.excelStats.patrimoine > 0 && !pipeline?.process.inProgress && (
                  <> → {pipeline.process.excelStats.patrimoine} patrimoine, {pipeline.process.excelStats.plages} plages, {pipeline.process.excelStats.randos} randos</>
                )}
              </p>
              <p className="mt-1 text-xs text-[#333333]/60">
                Reprise : <code className="rounded bg-[#FFF2EB] px-1">--from=17</code> si arrêt avant la fin
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {pipeline?.enrich.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : pipeline?.enrich.inProgress ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333333]/40" />
            )}
            <div className="flex-1">
              <span className="font-medium text-[#333333]">3. Enrichissement</span>
              {pipeline?.enrich.inProgress && (
                <span className="ml-2 text-sm text-amber-600">
                  En cours — {pipeline.enrich.inProgress.sheet} {pipeline.enrich.inProgress.current}/{pipeline.enrich.inProgress.total}
                </span>
              )}
              <p className="text-sm text-[#333333]/80">
                <code className="rounded bg-[#FFF2EB] px-1">npx tsx scripts/enrich-lieux-central.ts</code>
                — Mapbox (lat/lng), INSEE, Wikipedia, vérif départements
              </p>
              {pipeline?.process.hasExcel && !pipeline?.enrich.done && !pipeline?.enrich.inProgress && (
                <button
                  type="button"
                  onClick={runEnrich}
                  disabled={!!actionLoading}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-[#A55734] bg-white px-3 py-1.5 text-sm font-medium text-[#A55734] transition hover:bg-[#FFF2EB] disabled:opacity-60"
                >
                  {actionLoading === "enrich-lieux" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Lancer enrichissement
                </button>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#333333]/40" />
            <div>
              <span className="font-medium text-[#333333]">4. À venir</span>
              <p className="text-sm text-[#333333]/80">
                Batches descriptions villes (Top 100, puis autres)
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-sm text-[#333333]/60">
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
