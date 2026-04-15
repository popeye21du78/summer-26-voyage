"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Map, Route, Heart, Sparkles } from "lucide-react";
import { saveTripDraft } from "@/lib/planifier-draft";

export default function CreateEntry() {
  const router = useRouter();
  const sp = useSearchParams();
  const fromStar = sp.get("fromStar");
  const regionParam = sp.get("region");

  function pickMode(mode: "zone" | "axis" | "favorites" | "star") {
    if (mode === "zone") {
      saveTripDraft({
        mode: "zone",
        updatedAt: new Date().toISOString(),
        zone: {
          regionKey: regionParam ?? "bretagne",
          regionLabel: regionParam?.replace(/-/g, " ") ?? "Bretagne",
          days: 7,
          pace: "equilibre",
          priorities: [],
          notoriety: "equilibre",
          tripForm: "options",
        },
      });
    } else if (mode === "axis") {
      saveTripDraft({
        mode: "axis",
        updatedAt: new Date().toISOString(),
        axis: {
          startLabel: "",
          endLabel: "",
          startLat: 0,
          startLng: 0,
          endLat: 0,
          endLng: 0,
          returnToStart: false,
          days: 7,
          corridorTendency: "detours_legers",
          priorities: [],
          notoriety: "equilibre",
          routeVsDiscovery: "ambiance",
        },
      });
    } else if (mode === "star" && fromStar) {
      saveTripDraft({
        mode: "zone",
        updatedAt: new Date().toISOString(),
        fromTerritoryId: fromStar,
        zone: {
          regionKey: regionParam ?? "",
          regionLabel: regionParam?.replace(/-/g, " ") ?? "",
          days: 5,
          pace: "equilibre",
          priorities: [],
          notoriety: "equilibre",
          tripForm: "mobile",
        },
      });
    }
    router.push("/preparer/cadrage");
  }

  return (
    <main className="flex h-full flex-col bg-[#111111]">
      <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
        <p className="font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[#E07856]">
          Créer un voyage
        </p>
        <h1 className="mt-3 font-courier text-[2rem] font-bold leading-tight tracking-tight text-white">
          Par où tu veux
          <br />
          commencer ?
        </h1>

        {/* Primary choices */}
        <div className="mt-10 space-y-4">
          <button
            onClick={() => pickMode("zone")}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/6 bg-white/3 p-5 text-left transition hover:border-[#E07856]/25 hover:bg-white/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E07856]/10">
              <Map className="h-6 w-6 text-[#E07856]" />
            </div>
            <div>
              <p className="font-courier text-base font-bold text-white/85">
                Explorer une zone
              </p>
              <p className="mt-0.5 font-courier text-xs text-white/35">
                Choisis une région ou un coin
              </p>
            </div>
          </button>

          <button
            onClick={() => pickMode("axis")}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/6 bg-white/3 p-5 text-left transition hover:border-[#E07856]/25 hover:bg-white/5 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E07856]/10">
              <Route className="h-6 w-6 text-[#E07856]" />
            </div>
            <div>
              <p className="font-courier text-base font-bold text-white/85">
                Tracer un trajet
              </p>
              <p className="mt-0.5 font-courier text-xs text-white/35">
                Pars d&apos;un point A vers un point B
              </p>
            </div>
          </button>
        </div>

        {/* Secondary options */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => pickMode("favorites")}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 px-4 py-2 font-courier text-xs text-white/35 transition hover:border-[#E07856]/25 hover:text-white/60"
          >
            <Heart className="h-3.5 w-3.5" />
            Utiliser mes coups de cœur
          </button>
          {fromStar && (
            <button
              onClick={() => pickMode("star")}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 px-4 py-2 font-courier text-xs text-white/35 transition hover:border-[#E07856]/25 hover:text-white/60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Partir d&apos;un itinéraire
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
