"use client";

import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import type { EditorialTerritory } from "@/lib/editorial-territories";
import { addFavorite } from "@/lib/planifier-favorites";
import { mergeTerritoryIntoDraft } from "@/lib/planifier-draft";

export default function TerritoryDetailClient({
  territory: t,
}: {
  territory: EditorialTerritory;
}) {
  function heart(status: "inspiration" | "soft" | "hard") {
    addFavorite({
      kind: "territory",
      status,
      label: t.name,
      refId: t.id,
      meta: { region_key: t.region_key },
    });
  }

  return (
    <main className="page-under-header mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/planifier/inspiration"
        className="mb-6 inline-flex items-center gap-1 font-courier text-sm font-bold text-[var(--color-accent-end)] hover:text-[var(--color-accent-deep)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Carte inspiration
      </Link>

      <div className="mb-6 aspect-[21/9] w-full rounded-2xl bg-gradient-to-br from-[#FFF2EB] to-[var(--color-accent-start)]/25" />

      <h1 className="font-courier text-2xl font-bold text-[#333]">{t.name}</h1>
      <p className="mt-3 font-courier text-sm leading-relaxed text-[#333]/90">{t.pitch}</p>

      <section className="mt-8">
        <h2 className="font-courier text-sm font-bold uppercase tracking-wide text-[var(--color-accent-end)]">
          Pourquoi y aller
        </h2>
        <p className="mt-2 font-courier text-sm leading-relaxed text-[#333]/85">
          Types de lieux dominants : {t.tags.join(", ")}. Durées idéales (jours) :{" "}
          {t.ideal_durations.join(", ")}. Formes possibles : {t.trip_styles.join(", ")}.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-courier text-sm font-bold uppercase tracking-wide text-[var(--color-accent-end)]">
          Exemples de parcours
        </h2>
        <ul className="mt-2 list-inside list-disc font-courier text-sm text-[#333]/85">
          <li>Boucle {t.ideal_durations[0] ?? 5} jours</li>
          <li>Itinéraire {t.ideal_durations[1] ?? 8} jours</li>
          <li>Exploration lente {t.ideal_durations[2] ?? 12} jours ou base fixe + excursions</li>
        </ul>
        <p className="mt-2 font-courier text-xs text-[#333]/70">
          Pépites : {t.poi_clusters.join(" · ")}
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--color-accent-end)]/15 pt-6">
        <span className="w-full font-courier text-xs font-bold text-[var(--color-accent-end)]">Coup de cœur</span>
        <button
          type="button"
          onClick={() => heart("inspiration")}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-end)]/30 px-3 py-1.5 font-courier text-xs font-bold"
        >
          <Heart className="h-3.5 w-3.5" /> Inspiration
        </button>
        <button
          type="button"
          onClick={() => heart("soft")}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-end)]/30 px-3 py-1.5 font-courier text-xs font-bold"
        >
          <Heart className="h-3.5 w-3.5" /> Si possible
        </button>
        <button
          type="button"
          onClick={() => heart("hard")}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-end)]/30 px-3 py-1.5 font-courier text-xs font-bold"
        >
          <Heart className="h-3.5 w-3.5" /> Indispensable
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/planifier/zone?territoire=${encodeURIComponent(t.id)}`}
          onClick={() => mergeTerritoryIntoDraft(t.id, t.region_key, t.name)}
          className="rounded-full border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-5 py-2.5 font-courier text-sm font-bold text-white shadow-md"
        >
          Créer un voyage ici
        </Link>
        <Link
          href="/planifier/commencer"
          className="rounded-full border-2 border-[var(--color-accent-end)]/35 px-5 py-2.5 font-courier text-sm font-bold text-[var(--color-accent-end)]"
        >
          Retour accueil
        </Link>
      </div>
    </main>
  );
}
