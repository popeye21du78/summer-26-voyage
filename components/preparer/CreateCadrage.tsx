"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Gauge, MapPin, ArrowRight } from "lucide-react";
import { loadTripDraft, saveTripDraft } from "@/lib/planifier-draft";

const RYTHMES = [
  { id: "tranquille", label: "Tranquille", desc: "Peu de route, savourez" },
  { id: "equilibre", label: "Équilibré", desc: "Découvertes et repos" },
  { id: "soutenu", label: "Dense", desc: "Un max de choses à voir" },
] as const;

type Rythme = (typeof RYTHMES)[number]["id"];

export default function CreateCadrage() {
  const router = useRouter();
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [rythme, setRythme] = useState<Rythme>("equilibre");
  const [lieuSearch, setLieuSearch] = useState("");

  function handleSubmit() {
    const draft = loadTripDraft();
    const startDate = dateDebut || new Date().toISOString().slice(0, 10);
    let days = 7;
    if (dateDebut && dateFin) {
      const ms = new Date(dateFin).getTime() - new Date(dateDebut).getTime();
      days = Math.max(1, Math.round(ms / 86400000));
    }

    if (draft) {
      if (draft.zone) {
        draft.zone.days = days;
        draft.zone.pace = rythme;
      }
      if (draft.axis) {
        draft.axis.days = days;
      }
      saveTripDraft(draft);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "preparer-cadrage",
        JSON.stringify({ dateDebut: startDate, dateFin, rythme, lieuSearch, days })
      );
    }

    router.push("/preparer/itineraire");
  }

  return (
    <main className="flex h-full flex-col bg-[var(--color-bg-main)]">
      <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
        <p className="font-title text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--color-accent-start)]">
          Ton voyage
        </p>
        <h1 className="mt-3 font-title text-[1.75rem] font-bold leading-tight text-white">
          Quelques repères
          <br />
          pour commencer.
        </h1>

        {/* Dates */}
        <section className="mt-10">
          <label className="flex items-center gap-2 font-title text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
            <Calendar className="h-4 w-4" />
            Quand pars-tu ?
          </label>
          <div className="mt-3 flex gap-3">
            <div className="flex-1">
              <label className="font-courier text-[10px] text-white/40">Début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 font-courier text-sm text-white focus:border-[var(--color-accent-start)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]/25"
              />
            </div>
            <div className="flex-1">
              <label className="font-courier text-[10px] text-white/40">
                Fin <span className="text-white/20">(optionnel)</span>
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 font-courier text-sm text-white focus:border-[var(--color-accent-start)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]/25"
              />
            </div>
          </div>
        </section>

        {/* Rythme */}
        <section className="mt-8">
          <label className="flex items-center gap-2 font-title text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
            <Gauge className="h-4 w-4" />
            Quel rythme ?
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {RYTHMES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRythme(r.id)}
                className={`flex flex-col items-center rounded-xl border-2 px-3 py-3 transition ${
                  rythme === r.id
                    ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)]/8"
                    : "border-white/8 bg-white/3 hover:border-white/15"
                }`}
              >
                <span
                  className={`font-courier text-sm font-bold ${
                    rythme === r.id ? "text-[var(--color-accent-start)]" : "text-white/70"
                  }`}
                >
                  {r.label}
                </span>
                <span className="mt-0.5 font-courier text-[10px] text-white/35">
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Lieu indispensable */}
        <section className="mt-8">
          <label className="flex items-center gap-2 font-title text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
            <MapPin className="h-4 w-4" />
            Un endroit que tu ne veux pas manquer ?
          </label>
          <input
            type="text"
            value={lieuSearch}
            onChange={(e) => setLieuSearch(e.target.value)}
            placeholder="Optionnel"
            className="mt-3 w-full rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 font-courier text-sm text-white placeholder:text-white/20 focus:border-[var(--color-accent-start)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]/25"
          />
        </section>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          className="btn-orange-glow mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-courier text-sm font-bold text-white active:scale-[0.99]"
        >
          Voir mon itinéraire
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
