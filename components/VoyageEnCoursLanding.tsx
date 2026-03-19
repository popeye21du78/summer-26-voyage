"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown } from "lucide-react";
import VoyageStepsMap from "./VoyageStepsMap";
import HeroPhotoStrip from "./HeroPhotoStrip";
import type { VoyageStateResponse } from "../app/api/voyage-state/route";

type Props = {
  state: VoyageStateResponse;
};

export default function VoyageEnCoursLanding({ state }: Props) {
  const router = useRouter();
  const voyage = state.voyageEnCours!;
  const stepsDuJour = state.stepsDuJour ?? [];
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  async function handleSortirDuVoyage() {
    await fetch("/api/voyage-state/first-login", { method: "POST" });
    router.push("/accueil");
    router.refresh();
  }

  const stepsForMap = stepsDuJour.map((s) => ({
    id: s.id,
    nom: s.nom,
    coordonnees: { lat: s.lat, lng: s.lng },
    date_prevue: "",
    description_culture: s.description,
    budget_prevu: 0,
    contenu_voyage: { photos: [] as string[] },
  }));

  const photos = (voyage.steps ?? []).flatMap((s) =>
    (s.contenu_voyage?.photos ?? []).map((url) => ({ url, nom: s.nom }))
  );

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <HeroPhotoStrip photos={photos} />

      {/* Contenu — style terracotta cohérent avec le reste */}
      <div className="relative z-20 flex flex-1 flex-col px-4 py-8 pt-16">
        <p className="mb-1 font-courier text-sm font-bold uppercase tracking-widest text-white/90">
          Voyage en cours
        </p>
        <h1 className="mb-2 font-courier text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
          Votre journée aujourd&apos;hui
        </h1>
        <p className="mb-6 font-courier text-sm text-white/80">
          Jour {state.jourActuel} · {voyage.titre}
        </p>

        {stepsDuJour.length > 0 && (
          <div className="mb-6 flex-1">
            <VoyageStepsMap
              steps={stepsForMap}
              mapboxAccessToken={token}
              height={220}
            />
          </div>
        )}

        <ul className="mb-8 space-y-3">
          {stepsDuJour.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/15 p-4 backdrop-blur-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E07856] text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-courier font-bold text-white">{s.nom}</p>
                <p className="font-courier text-sm text-white/80">
                  {s.dureeConseillee ?? "2-3 h"}
                </p>
              </div>
              <Link
                href={`/ville/${s.id}`}
                className="ml-auto font-courier text-sm font-bold text-[#E07856] hover:underline"
              >
                Voir →
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <Link
            href={`/voyage/${voyage.id}/en-cours`}
            className="btn-terracotta flex items-center justify-center rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-4 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
          >
            Voir tout le voyage
          </Link>
          <button
            type="button"
            onClick={handleSortirDuVoyage}
            className="flex items-center justify-center gap-2 rounded-[50px] border-2 border-white/60 bg-white/10 px-6 py-3 font-courier font-bold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Sortir du voyage
          </button>
        </div>
      </div>

      <div className="relative z-20 flex justify-center py-4">
        <button
          type="button"
          onClick={() =>
            document.getElementById("on-repart")?.scrollIntoView({
              behavior: "smooth",
            })
          }
          className="flex flex-col items-center gap-2 font-courier text-white/90 transition-all duration-300 hover:scale-110"
        >
          <span className="text-sm font-bold">On repart ?</span>
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
