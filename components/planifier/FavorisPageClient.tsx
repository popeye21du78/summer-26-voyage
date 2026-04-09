"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  getFavoritesForPrefill,
  listFavorites,
  removeFavorite,
  updateFavoriteStatus,
  type FavoriteStatus,
  type PlanifierFavorite,
} from "@/lib/planifier-favorites";

const STATUS_LABELS: Record<FavoriteStatus, string> = {
  inspiration: "Inspiration",
  soft: "Si possible",
  hard: "Indispensable",
};

export default function FavorisPageClient() {
  const [items, setItems] = useState<PlanifierFavorite[]>(() => listFavorites());
  const [prefill, setPrefill] = useState(() => getFavoritesForPrefill());

  const refresh = useCallback(() => {
    setItems(listFavorites());
    setPrefill(getFavoritesForPrefill());
  }, []);

  return (
    <main className="page-under-header mx-auto max-w-lg px-4 py-10">
      <Link href="/planifier" className="font-courier text-sm font-bold text-[#A55734] underline">
        Hub planifier
      </Link>
      <h1 className="mt-6 font-courier text-2xl font-bold text-[#333]">Coups de cœur</h1>
      <p className="mt-2 font-courier text-xs text-[#333]/80">
        Territoires, lieux ou idées de parcours. Le statut distingue envie et contrainte pour le
        pré-remplissage des flux.
      </p>

      {prefill && (prefill.territoryIds.length > 0 || prefill.hardPlaceLabels.length > 0) && (
        <div className="mt-6 rounded-xl border border-[#E07856]/35 bg-[#FFF2EB]/50 p-4 font-courier text-xs">
          <p className="font-bold text-[#A55734]">Pré-remplissage</p>
          {prefill.territoryIds.length > 0 && (
            <p className="mt-1">
              Territoires à intégrer : {prefill.territoryIds.join(", ")} —{" "}
              <Link href="/planifier/zone" className="underline">
                ouvrir le flux zone
              </Link>
            </p>
          )}
          {prefill.hardPlaceLabels.length > 0 && (
            <p className="mt-1">
              Lieux indispensables : {prefill.hardPlaceLabels.join(", ")} —{" "}
              <Link href="/planifier/lieux" className="underline">
                flux lieux
              </Link>
            </p>
          )}
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {items.length === 0 && (
          <li className="font-courier text-sm text-[#333]/70">Aucun coup de cœur pour le moment.</li>
        )}
        {items.map((f) => (
          <li
            key={f.id}
            className="flex flex-col gap-2 rounded-xl border border-[#A55734]/20 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-courier text-xs uppercase text-[#A55734]/80">{f.kind}</span>
              <p className="font-courier text-sm font-bold text-[#333]">{f.label}</p>
              <p className="font-courier text-xs text-[#333]/60">{f.refId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={f.status}
                onChange={(e) => {
                  updateFavoriteStatus(f.id, e.target.value as FavoriteStatus);
                  refresh();
                }}
                className="rounded-lg border border-[#A55734]/30 px-2 py-1 font-courier text-xs"
              >
                {(Object.keys(STATUS_LABELS) as FavoriteStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  removeFavorite(f.id);
                  refresh();
                }}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
