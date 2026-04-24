"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Map,
  Route,
  Heart,
  Sparkles,
  Compass,
  Clock,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { loadTripDraft, saveTripDraft, type TripDraft } from "@/lib/planifier-draft";

const INSPIRATIONS: Array<{
  slug: string;
  label: string;
  hint: string;
  href: string;
}> = [
  {
    slug: "littoral",
    label: "Littoral",
    hint: "Falaises, plages, villages de pêcheurs",
    href: "/inspirer?tab=stars&theme=littoral",
  },
  {
    slug: "montagne",
    label: "Montagne",
    hint: "Cols, lacs, villages d'alpage",
    href: "/inspirer?tab=stars&theme=montagne",
  },
  {
    slug: "chateaux",
    label: "Châteaux",
    hint: "Patrimoine, Loire, forteresses",
    href: "/inspirer?tab=stars&theme=chateaux",
  },
];

function formatDraftLabel(d: TripDraft | null): string | null {
  if (!d) return null;
  if (d.mode === "zone" && d.zone?.regionLabel) {
    return `Zone · ${d.zone.regionLabel} (${d.zone.days}j)`;
  }
  if (d.mode === "axis" && d.axis) {
    const from = d.axis.startLabel || "?";
    const to = d.axis.endLabel || "?";
    return `Trajet · ${from} → ${to}`;
  }
  if (d.mode === "places" && d.places?.items?.length) {
    return `Lieux · ${d.places.items.length} étape${d.places.items.length > 1 ? "s" : ""}`;
  }
  if (d.mode === "inspiration") return "Inspiration en cours";
  return null;
}

export default function CreateEntry() {
  const router = useRouter();
  const sp = useSearchParams();
  const fromStar = sp.get("fromStar");
  const regionParam = sp.get("region");

  const [draft, setDraft] = useState<TripDraft | null>(null);
  useEffect(() => {
    setDraft(loadTripDraft());
  }, []);

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

  const draftLabel = formatDraftLabel(draft);

  return (
    <main className="relative flex min-h-full flex-col overflow-x-hidden">
      <div className="flex min-h-full flex-col gap-8 px-6 pb-6 pt-[calc(env(safe-area-inset-top,0px)+2rem)]">
        {/* ——— Header narratif ——— */}
        <header className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--color-accent-start)]">
            <Compass className="h-3.5 w-3.5" />
            Créer un voyage
          </p>
          <h1 className="font-title text-[2.25rem] font-bold leading-[1.02] tracking-tight text-[var(--color-text-primary)]">
            Par où tu veux
            <br />
            <span className="text-gradient-viago-title-alt">commencer ?</span>
          </h1>
          <p className="max-w-[90%] font-courier text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Deux façons d&apos;ouvrir la route. Choisis la plus naturelle —
            tu pourras toujours changer d&apos;avis.
          </p>
        </header>

        {/* ——— Reprise brouillon (si présent) ——— */}
        {draftLabel && (
          <Link
            href="/preparer/cadrage"
            className="viago-glass-card flex items-center gap-4 px-4 py-3.5 transition hover:brightness-110"
            style={{ borderColor: "color-mix(in srgb, var(--color-accent-start) 35%, var(--color-glass-border))" }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--color-accent-start) 18%, transparent)" }}
            >
              <Clock className="h-5 w-5 text-[var(--color-accent-start)]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                Reprendre là où tu t&apos;étais arrêté
              </span>
              <span className="mt-0.5 block truncate font-courier text-sm text-[var(--color-text-primary)]">
                {draftLabel}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-[var(--color-accent-start)]" />
          </Link>
        )}

        {/* ——— Choix principaux (2 cartes verre premium) ——— */}
        <section className="grid gap-4">
          <button
            onClick={() => pickMode("zone")}
            className="viago-glass-card viago-glass-card--accent-border group flex items-start gap-4 p-5 text-left transition hover:brightness-110 active:scale-[0.99]"
          >
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-cta)", boxShadow: "0 6px 18px var(--color-shadow-cta-accent)" }}
            >
              <Map className="h-7 w-7 text-white" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-title block text-xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                Explorer une zone
              </span>
              <span className="mt-1 block font-courier text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Choisis une région, pose une durée, laisse la carte te guider.
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                Base fixe · Multi-bases · Mobile
                <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </span>
          </button>

          <button
            onClick={() => pickMode("axis")}
            className="viago-glass-card viago-glass-card--accent-border group flex items-start gap-4 p-5 text-left transition hover:brightness-110 active:scale-[0.99]"
          >
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-cta)", boxShadow: "0 6px 18px var(--color-shadow-cta-accent)" }}
            >
              <Route className="h-7 w-7 text-white" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-title block text-xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                Tracer un trajet
              </span>
              <span className="mt-1 block font-courier text-xs leading-relaxed text-[var(--color-text-secondary)]">
                D&apos;un point A vers un point B — avec des détours qui valent
                la route.
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                Direct · Détours · Grand contournement
                <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </span>
          </button>
        </section>

        {/* ——— Options secondaires ——— */}
        <section className="flex flex-wrap items-center gap-2">
          <span className="font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Autres entrées :
          </span>
          <button
            onClick={() => pickMode("favorites")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] px-3 py-1.5 font-courier text-[11px] font-bold text-[var(--color-text-primary)]/70 backdrop-blur-md transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_45%,transparent)] hover:text-[var(--color-accent-start)]"
          >
            <Heart className="h-3.5 w-3.5" />
            Mes coups de cœur
          </button>
          {fromStar && (
            <button
              onClick={() => pickMode("star")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] px-3 py-1.5 font-courier text-[11px] font-bold text-[var(--color-text-primary)]/70 backdrop-blur-md transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_45%,transparent)] hover:text-[var(--color-accent-start)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Partir d&apos;un itinéraire
            </button>
          )}
        </section>

        {/* ——— Tu hésites ? ——— */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[var(--color-accent-gold)]" />
            <h2 className="font-title text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-primary)]">
              Tu hésites ? Laisse-toi guider.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {INSPIRATIONS.map((it) => (
              <Link
                key={it.slug}
                href={it.href}
                className="viago-glass-card group flex flex-col items-start gap-1.5 px-3 py-3 transition hover:brightness-110"
              >
                <span className="font-courier text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  {it.label}
                </span>
                <span className="font-courier text-[10px] leading-tight text-[var(--color-text-secondary)]">
                  {it.hint}
                </span>
                <ArrowRight className="mt-1 h-3 w-3 text-[var(--color-accent-start)] transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        {/* ——— Footer éditorial ——— */}
        <footer className="mt-auto pt-6">
          <div
            className="relative overflow-hidden rounded-2xl px-5 py-5"
            style={{
              background: `linear-gradient(
                135deg,
                color-mix(in srgb, var(--color-accent-deep) 40%, var(--color-bg-secondary)) 0%,
                color-mix(in srgb, var(--color-accent-start) 24%, var(--color-bg-main)) 55%,
                var(--color-bg-tertiary) 100%
              )`,
              boxShadow:
                "inset 0 1px 0 var(--color-glass-highlight), 0 14px 34px var(--color-shadow-card)",
            }}
          >
            <span
              className="pointer-events-none absolute inset-x-6 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-glass-highlight), transparent)",
              }}
              aria-hidden
            />
            <p className="font-motto text-[1.15rem] leading-tight text-[var(--color-text-primary)]">
              « Le voyage n&apos;est pas un plan parfait — c&apos;est la
              certitude qu&apos;on pourra tout ajuster en route. »
            </p>
            <p className="mt-2 font-courier text-[10px] uppercase tracking-[0.28em] text-[var(--color-text-primary)]/55">
              Viago — carnet &amp; planificateur
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
