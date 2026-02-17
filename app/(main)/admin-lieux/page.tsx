"use client";

import { useState, useEffect } from "react";

interface Departement {
  code: string;
  departement: string;
  tier: string;
}

export default function AdminLieuxPage() {
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/cities?list_departements=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.departements) {
          setDepartements(data.departements);
          if (data.departements.length > 0) setSelectedCode(data.departements[0].code);
        }
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!selectedCode || loading) return;
    setLoading(true);
    setOutput(null);
    setError(null);

    try {
      const res = await fetch("/api/generate-departement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeDep: selectedCode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Erreur inconnue");
      } else {
        setOutput(data.output);
        setHistory((prev) => [data.output, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const selectedDep = departements.find((d) => d.code === selectedCode);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-light text-[#333333]">
        Admin — Génération de lieux
      </h1>
      <p className="mb-8 text-[#333333]/70">
        Sélectionne un département, clique sur Générer. Le script purge les anciennes données,
        appelle GPT-4o, écrit dans Excel et enrichit (Mapbox, INSEE, Wikipedia). Durée : 1-3 min.
      </p>

      {/* Sélecteur */}
      <div className="mb-6 flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="dep-select" className="mb-1 block text-sm text-[#333333]/80">
            Département
          </label>
          <select
            id="dep-select"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border-2 border-[#7a3d22]/40 bg-white px-3 py-2.5 text-sm text-[#333333] shadow-sm focus:border-[#A55734] focus:outline-none disabled:opacity-50"
          >
            {departements.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.departement} (Tier {d.tier})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !selectedCode}
          className="rounded-lg bg-[#A55734] px-6 py-2.5 text-sm font-medium text-[#FFFBF7] shadow-sm transition hover:bg-[#7a3d22] disabled:opacity-50"
        >
          {loading ? "En cours..." : "Générer"}
        </button>
      </div>

      {/* Info département sélectionné */}
      {selectedDep && !loading && !output && !error && (
        <div className="mb-6 rounded-lg border-2 border-[#7a3d22]/20 bg-[#FAF4F0] px-4 py-3">
          <span className="text-sm text-[#333333]/80">
            <strong>{selectedDep.departement}</strong> — Tier {selectedDep.tier}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-6 rounded-lg border-2 border-[#A55734]/30 bg-[#FFF2EB] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#A55734] border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-[#333333]">
                Génération en cours pour {selectedDep?.departement ?? selectedCode}...
              </p>
              <p className="text-xs text-[#333333]/60">
                Purge + GPT-4o + Excel + enrichissement Mapbox/INSEE/Wikipedia (1-3 min)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
          <p className="mb-1 text-sm font-medium text-red-800">Erreur</p>
          <pre className="whitespace-pre-wrap text-xs text-red-700">{error}</pre>
          <p className="mt-2 text-xs text-red-600">
            Astuce : ferme lieux-central.xlsx dans Excel avant de relancer, ou utilise le terminal :
            <code className="ml-1 rounded bg-red-100 px-1.5 py-0.5 font-mono">
              npx tsx scripts/generate-departement.ts {selectedCode}
            </code>
          </p>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="mb-8 rounded-lg border-2 border-green-300 bg-green-50 px-4 py-4">
          <p className="mb-2 text-sm font-medium text-green-800">Terminé !</p>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-green-700">
            {output}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-normal text-[#333333]">Historique de session</h2>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <details
                key={i}
                className="rounded-lg border border-[#7a3d22]/20 bg-[#FAF4F0]"
              >
                <summary className="cursor-pointer px-3 py-2 text-sm text-[#333333]/80">
                  Génération #{history.length - i}
                </summary>
                <pre className="whitespace-pre-wrap px-3 pb-2 font-mono text-xs text-[#333333]/70">
                  {h}
                </pre>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Terminal shortcut */}
      <section className="mt-8 rounded-lg border border-[#7a3d22]/10 bg-[#FAF4F0]/50 px-4 py-3">
        <p className="text-xs text-[#333333]/60">
          Alternative terminal (si Excel est ouvert) :
          <code className="ml-1 rounded bg-[#7a3d22]/10 px-1.5 py-0.5 font-mono text-[#A55734]">
            npx tsx scripts/generate-departement.ts {selectedCode || "XX"}
          </code>
        </p>
      </section>
    </main>
  );
}
