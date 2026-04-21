"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { LogOut, MapPin, ChevronDown, Fuel, Route } from "lucide-react";
import VoyageStepsMap from "../../../../../components/VoyageStepsMap";
import { StepLieuThumb } from "../../../../../components/StepLieuThumb";
import type { VoyageStateResponse } from "@/types/voyage-state";

export default function VoyageEnCoursPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const restRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setState(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!state?.premiereConnexionDuJour || !restRef.current) return;
    const el = restRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetch("/api/voyage-state/first-login", { method: "POST" });
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [state?.premiereConnexionDuJour]);

  async function handleSortirDuVoyage() {
    await fetch("/api/voyage-state/first-login", { method: "POST" });
    router.push("/accueil");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="page-under-header flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  const voyage = state?.voyageEnCours;
  const isFirstConnexion = state?.premiereConnexionDuJour ?? false;
  const stepsDuJour = state?.stepsDuJour ?? [];
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  if (!voyage || voyage.id !== slug) {
    return (
      <main className="page-under-header flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="font-courier text-[#333333]/80">Voyage introuvable.</p>
        <Link
          href="/accueil"
          className="font-courier font-bold text-[var(--color-accent-start)] underline transition hover:no-underline"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const stepsRestantsFiltered =
    state.jourActuel != null
      ? voyage.steps.slice(state.jourActuel)
      : voyage.steps;

  return (
    <main className="page-under-header">
      {isFirstConnexion && stepsDuJour.length > 0 && (
        <section
          className="relative flex min-h-[calc(100dvh-5rem)] flex-col"
          id="journee-du-jour"
        >
          <div className="flex flex-1 flex-col px-4 py-8">
            <h1 className="mb-2 scroll-mt-28 font-courier text-2xl font-bold text-[#333333]">
              Votre journée d&apos;aujourd&apos;hui
            </h1>
            <p className="mb-6 font-courier text-sm text-[#333333]/70">
              Jour {state.jourActuel} · {voyage.titre}
            </p>

            <div className="mb-6 flex-1">
              <VoyageStepsMap
                steps={stepsDuJour.map((s) => ({
                  id: s.id,
                  nom: s.nom,
                  coordonnees: { lat: s.lat, lng: s.lng },
                  date_prevue: "",
                  description_culture: s.description,
                  budget_prevu: 0,
                  contenu_voyage: { photos: [] },
                }))}
                mapboxAccessToken={token}
                height={280}
              />
            </div>

            <ul className="mb-8 space-y-3">
              {stepsDuJour.map((s, i) => (
                <li key={s.id}>
                  <Link
                    href={`/ville/${s.id}`}
                    className="group flex items-center gap-4 overflow-hidden rounded-xl border border-[var(--color-accent-start)]/15 bg-white p-0 shadow-sm transition-all hover:border-[var(--color-accent-start)]/40 hover:shadow-lg"
                  >
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-l-xl bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-mid)] font-courier text-lg font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 py-3">
                      <p className="font-medium text-[#333333]">{s.nom}</p>
                      <p className="text-sm text-[#333333]/70">
                        {s.dureeConseillee ?? "2-3 h"}
                      </p>
                    </div>
                    <span className="mr-4 font-courier text-sm font-bold text-[var(--color-accent-start)] transition group-hover:translate-x-1">
                      Voir →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleSortirDuVoyage}
              className="btn-terracotta flex w-full items-center justify-center gap-2 rounded-[50px] border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-6 py-4 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[var(--color-accent-start)]/50"
            >
              <LogOut className="h-5 w-5" />
              Sortir du voyage
            </button>
          </div>
        </section>
      )}

      <section
        ref={restRef}
        className={`border-t border-[var(--color-accent-start)]/10 px-4 py-10 ${
          isFirstConnexion && stepsDuJour.length > 0 ? "" : "pt-6"
        }`}
        id="ce-qui-reste"
      >
        <div className="mx-auto max-w-2xl">
          {isFirstConnexion && stepsDuJour.length > 0 && (
            <button
              type="button"
              onClick={() =>
                document.getElementById("ce-qui-reste")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="mb-6 flex w-full items-center justify-center gap-2 font-courier font-bold text-[var(--color-accent-start)]"
            >
              <ChevronDown className="h-5 w-5" />
              Voir ce qui reste du voyage
            </button>
          )}

          <h2 className="mb-4 scroll-mt-28 font-courier text-xl font-bold text-[#333333]">
            Ce qui reste du voyage
          </h2>
          <div className="mb-8">
            <VoyageStepsMap
              steps={stepsRestantsFiltered}
              mapboxAccessToken={token}
              linkToVille
              height={300}
            />
          </div>

          <ul className="mb-8 space-y-2">
            {stepsRestantsFiltered.map((s) => {
              return (
                <li key={s.id}>
                  <Link
                    href={`/ville/${s.id}`}
                    className="group flex items-center gap-3 overflow-hidden rounded-xl border border-[var(--color-accent-start)]/15 bg-white/80 p-2 transition-all hover:border-[var(--color-accent-start)]/40 hover:shadow-md"
                  >
                    <StepLieuThumb
                      stepId={s.id}
                      nom={s.nom}
                      className="h-14 w-16 shrink-0"
                      roundedClassName="rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[#333333]">{s.nom}</span>
                      <span className="ml-2 text-sm text-[#333333]/60">
                        {s.date_prevue}
                      </span>
                    </div>
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--color-accent-start)]/60 transition group-hover:text-[var(--color-accent-start)]" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {voyage.stats && (
            <div className="mb-8 grid grid-cols-3 gap-4">
              {voyage.stats.km != null && (
                <div className="rounded-xl border border-[var(--color-accent-start)]/20 bg-white/60 p-4 text-center">
                  <Route className="mx-auto mb-1 h-5 w-5 text-[var(--color-accent-start)]" />
                  <p className="text-2xl font-light text-[#333333]">
                    {voyage.stats.km}
                  </p>
                  <p className="text-xs text-[#333333]/60">km</p>
                </div>
              )}
              {voyage.stats.essence != null && (
                <div className="rounded-xl border border-[var(--color-accent-start)]/20 bg-white/60 p-4 text-center">
                  <Fuel className="mx-auto mb-1 h-5 w-5 text-[var(--color-accent-start)]" />
                  <p className="text-2xl font-light text-[#333333]">
                    {voyage.stats.essence}
                  </p>
                  <p className="text-xs text-[#333333]/60">€ essence</p>
                </div>
              )}
              {voyage.stats.budget != null && (
                <div className="rounded-xl border border-[var(--color-accent-start)]/20 bg-white/60 p-4 text-center">
                  <p className="mx-auto mb-1 text-lg">💰</p>
                  <p className="text-2xl font-light text-[#333333]">
                    {voyage.stats.budget}
                  </p>
                  <p className="text-xs text-[#333333]/60">€ budget</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/viago/${voyage.id}?from=en-cours`}
              className="btn-terracotta rounded-[50px] border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-4 py-2 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[var(--color-accent-start)]/50"
            >
              Voir le Viago
            </Link>
            <Link
              href="/accueil"
              className="rounded-[50px] border-2 border-[var(--color-accent-start)]/40 px-4 py-2 font-courier font-bold text-[var(--color-accent-start)] transition-all duration-300 hover:scale-105 hover:bg-white/80"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
