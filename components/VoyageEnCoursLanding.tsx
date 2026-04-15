"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, MapPin } from "lucide-react";
import VoyageStepsMap from "./VoyageStepsMap";
import AccueilHeroBrandMark from "./home/AccueilHeroBrandMark";
import HomeDecorTitle from "./home/HomeDecorTitle";
import { SNAP_SECTION } from "./home/homeSectionTokens";
import type { VoyageStateResponse } from "@/types/voyage-state";
import type { Step } from "@/types";

type Props = {
  state: VoyageStateResponse;
};

function copyJour({
  stepsDuJour,
  jourActuel,
  voyageTitre,
}: {
  stepsDuJour: Array<{ nom: string; dureeConseillee?: string }>;
  jourActuel?: number;
  voyageTitre: string;
}) {
  const j = jourActuel ?? 1;
  const n = stepsDuJour.length;
  if (n === 0) {
    return {
      kicker: `Jour ${j} · ${voyageTitre}`,
      titre: "Rien d’ancré aujourd’hui",
      detail:
        "Ajoute une halte ou ouvre le carnier du voyage pour improviser.",
    };
  }
  if (n === 1) {
    const s = stepsDuJour[0];
    return {
      kicker: `Jour ${j} · une halte`,
      titre: s.nom,
      detail: s.dureeConseillee
        ? `Environ ${s.dureeConseillee} sur place — carnet, photos, anecdotes.`
        : "Ta journée tourne autour de ce lieu.",
    };
  }
  return {
    kicker: `Jour ${j} · ${n} haltes`,
    titre: "Ton fil de journée",
    detail: stepsDuJour.map((s) => s.nom).join(" → "),
  };
}

export default function VoyageEnCoursLanding({ state }: Props) {
  const router = useRouter();
  const voyage = state.voyageEnCours!;
  const stepsDuJour = state.stepsDuJour ?? [];
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const { kicker, titre, detail } = copyJour({
    stepsDuJour,
    jourActuel: state.jourActuel,
    voyageTitre: voyage.titre,
  });

  async function handleSortirDuVoyage() {
    await fetch("/api/voyage-state/first-login", { method: "POST" });
    router.push("/accueil");
    router.refresh();
  }

  const stepsForMap: Step[] = stepsDuJour.map((s) => ({
    id: s.id,
    nom: s.nom,
    coordonnees: { lat: s.lat, lng: s.lng },
    date_prevue: "",
    description_culture: s.description,
    budget_prevu: 0,
    contenu_voyage: { photos: [] },
  }));

  return (
    <section
      id="hero-section"
      className={`relative bg-gradient-to-b from-[#4a3a32] via-[#302824] to-[#221e1c] ${SNAP_SECTION}`}
    >
      <AccueilHeroBrandMark />
      <HomeDecorTitle lines={["AU", "JOUR"]} tone="onDark" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)]">
        <p className="mb-2 max-w-[78%] font-courier text-[10px] font-bold uppercase tracking-[0.35em] text-[#E07856]/90">
          {kicker}
        </p>
        <h1 className="relative mb-2 max-w-[92%] font-courier text-[1.85rem] font-bold leading-[1.05] tracking-tight text-[#FAF4F0] sm:text-[2.15rem]">
          {titre}
        </h1>
        <p className="mb-4 max-w-[95%] font-courier text-sm leading-snug text-[#FAF4F0]/65">
          {detail}
        </p>

        {stepsForMap.length > 0 && token ? (
          <div className="mb-4 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-[#0c0a08] shadow-[0_16px_48px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <VoyageStepsMap
              steps={stepsForMap}
              mapboxAccessToken={token}
              height={200}
              linkToVille
              voyageReturnSlug={voyage.id}
              variant="default"
            />
          </div>
        ) : stepsForMap.length > 0 ? (
          <p className="mb-4 rounded-xl border border-white/20 bg-white/5 px-3 py-2 font-courier text-xs text-white/70">
            Carte indisponible (token carte manquant).
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-3 font-courier text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
            Ordre du jour
          </p>
          <ul className="space-y-4">
            {stepsDuJour.map((s) => (
              <li
                key={s.id}
                className="border-l-2 border-[#E07856]/40 pl-4"
              >
                <p className="font-courier text-base font-bold text-white">
                  {s.nom}
                </p>
                <p className="font-courier text-xs text-white/55">
                  {s.dureeConseillee ?? "Sur place"}
                </p>
                <Link
                  href={`/inspirer/ville/${s.id}?v=${encodeURIComponent(voyage.id)}`}
                  className="mt-1.5 inline-flex items-center gap-1 font-courier text-xs font-bold text-[#E07856] hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  Ouvrir le carnet du lieu
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-2.5 pt-4">
          <Link
            href={`/mon-espace/voyage/${voyage.id}`}
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-4 font-courier text-base font-bold text-white shadow-[0_8px_28px_rgba(224,120,86,0.45)] transition hover:brightness-105 active:scale-[0.99]"
          >
            Accéder au voyage
          </Link>
          <button
            type="button"
            onClick={handleSortirDuVoyage}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 py-3 font-courier text-sm font-bold text-white/85 backdrop-blur-sm transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Quitter la vue « jour »
          </button>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 justify-start px-4 pb-3 pt-1">
        <button
          type="button"
          onClick={() =>
            document.getElementById("on-repart")?.scrollIntoView({
              behavior: "smooth",
            })
          }
          className="flex items-center gap-2 font-courier text-xs font-bold text-white/70"
        >
          Suite de l’accueil
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
