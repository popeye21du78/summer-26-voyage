"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Play, BookOpen, Plus } from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import type { VoyageStateResponse } from "@/types/voyage-state";
import type { Voyage } from "@/data/mock-voyages";
import {
  loadCreatedVoyages,
  upsertCreatedVoyage,
  type CreatedVoyage,
} from "@/lib/created-voyages";

type SubTab = "en_cours" | "a_venir" | "souvenirs";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "en_cours", label: "En cours" },
  { id: "a_venir", label: "À venir" },
  { id: "souvenirs", label: "Souvenirs" },
];

type Props = { state: VoyageStateResponse | null };

export default function EspaceVoyages({ state }: Props) {
  const router = useRouter();
  const [createdVoyages, setCreatedVoyages] = useState<CreatedVoyage[]>(() =>
    loadCreatedVoyages()
  );

  useEffect(() => {
    setCreatedVoyages(loadCreatedVoyages());
  }, []);

  useEffect(() => {
    const refresh = () => setCreatedVoyages(loadCreatedVoyages());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    void fetch("/api/created-voyage", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { drafts?: Array<{ payload: unknown }> } | null) => {
          if (!d?.drafts?.length) return;
          for (const row of d.drafts) {
            const p = row.payload;
            if (
              p &&
              typeof p === "object" &&
              "id" in p &&
              typeof (p as { id: string }).id === "string" &&
              (p as { id: string }).id.toLowerCase().startsWith("created-")
            ) {
              try {
                upsertCreatedVoyage(p as CreatedVoyage);
              } catch {
                /* ignore */
              }
            }
          }
          setCreatedVoyages(loadCreatedVoyages());
        }
      );
  }, []);

  useEffect(() => {
    void loadPhotoValidationSnapshot();
  }, []);

  const initial: SubTab = state?.voyageEnCours
    ? "en_cours"
    : state?.voyagePrevu ||
        (state?.voyagesPrevus && state.voyagesPrevus.length > 0) ||
        loadCreatedVoyages().length > 0
      ? "a_venir"
      : "souvenirs";
  const [tab, setTab] = useState<SubTab>(initial);

  useEffect(() => {
    if (createdVoyages.length > 0 && !state?.voyageEnCours) {
      setTab((t) => (t === "souvenirs" ? "a_venir" : t));
    }
  }, [createdVoyages.length, state?.voyageEnCours]);

  const enCours = state?.voyageEnCours ? [state.voyageEnCours] : [];
  const prevus =
    state?.voyagesPrevus && state.voyagesPrevus.length > 0
      ? state.voyagesPrevus
      : state?.voyagePrevu
        ? [state.voyagePrevu]
        : [];
  const termines = state?.voyagesTermines ?? [];

  return (
    <section className="px-4 pb-10 pt-4">
      <div className="relative z-20 mb-5 flex items-center justify-between gap-3">
        {/*
         * `router.push` + bouton (au lieu d’un seul <Link>) : évite les clics
         * « invisibles » quand un overlay / layer ou une transition d’onglet
         * intercepte la hitbox du lien.
         */}
        <button
          type="button"
          onClick={() => router.push("/preparer")}
          className="btn-orange-glow font-title inline-flex w-full min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-base font-bold uppercase tracking-wide text-white sm:flex-initial sm:px-8"
        >
          <Plus className="h-5 w-5" strokeWidth={2.2} />
          Nouveau voyage
        </button>
      </div>

      <div className="mb-5 flex gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            /*
             * Titres de sous-onglet (En cours / À venir / Souvenirs) →
             * police titre (user : « les titres souvenirs, à venir,
             * en cours »).
             */
            className={`min-h-[44px] flex-1 rounded-xl px-2 py-2.5 font-title text-sm font-bold uppercase tracking-wide transition sm:text-base ${
              tab === t.id
                ? "bg-[var(--color-accent-start)] text-white shadow-md"
                : "border border-white/12 bg-white/5 text-white/45 hover:border-white/20 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "en_cours" && (
        <div className="space-y-4">
          {enCours.length === 0 ? (
            <EmptyVoyageSlot text="Pas de voyage en cours." />
          ) : (
            enCours.map((v) => (
              <VoyageCard key={v.id} voyage={v} type="en_cours" />
            ))
          )}
        </div>
      )}

      {tab === "a_venir" && (
        <div className="space-y-4">
          {createdVoyages.map((cv) => (
            <CreatedVoyageCard key={cv.id} voyage={cv} />
          ))}
          {prevus.length === 0 && createdVoyages.length === 0 ? (
            <EmptyVoyageSlot text="Aucun voyage prévu." />
          ) : (
            prevus.map((v) => (
              <VoyageCard key={v.id} voyage={v} type="a_venir" />
            ))
          )}
        </div>
      )}

      {tab === "souvenirs" && (
        <div className="space-y-4">
          {termines.length === 0 ? (
            <EmptyVoyageSlot text="Tes souvenirs apparaîtront ici." />
          ) : (
            termines.map((v) => (
              <VoyageCard key={v.id} voyage={v} type="souvenirs" />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function VoyageCard({
  voyage,
  type,
}: {
  voyage: Voyage;
  type: "en_cours" | "a_venir" | "souvenirs";
}) {
  /** Toujours la fiche carte d’abord ; le Viago se fait depuis cette page. */
  const href = `/mon-espace/voyage/${voyage.id}`;

  const actionLabel =
    type === "en_cours"
      ? "Reprendre"
      : type === "a_venir"
        ? "Préparer"
        : "Revivre";

  const ActionIcon =
    type === "en_cours" ? Play : type === "a_venir" ? Calendar : BookOpen;

  return (
    <Link
      href={href}
      className="flex min-h-[88px] items-stretch gap-4 overflow-hidden rounded-2xl border border-white/6 bg-white/3 p-1 transition hover:border-[var(--color-accent-start)]/25 hover:bg-white/5"
    >
      <div className="relative h-[100px] w-24 shrink-0 overflow-hidden rounded-l-xl bg-[var(--color-bg-secondary)] sm:w-28">
        {voyage.steps[0] ? (
          <CityPhoto
            stepId={voyage.steps[0].id}
            ville={voyage.steps[0].nom}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            imageLoading="lazy"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
        {/*
         * Nom du voyage = titre (user : « les noms des voyages » en
         * police titre).
         */}
        <p className="font-title text-lg font-bold leading-snug text-white/95">
          {voyage.titre}
        </p>
        <p className="mt-1 font-courier text-sm text-white/40">{voyage.sousTitre}</p>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </span>
      </div>
    </Link>
  );
}

function CreatedVoyageCard({ voyage }: { voyage: CreatedVoyage }) {
  const first = voyage.steps[0];
  return (
    <Link
      href={`/mon-espace/voyage/${voyage.id}`}
      className="flex min-h-[88px] items-stretch gap-4 overflow-hidden rounded-2xl border border-[var(--color-accent-start)]/15 bg-[var(--color-accent-start)]/5 p-1 transition hover:border-[var(--color-accent-start)]/30"
    >
      <div className="relative h-[100px] w-24 shrink-0 overflow-hidden rounded-l-xl bg-[var(--color-accent-start)]/20 sm:w-28">
        {first ? (
          <CityPhoto
            stepId={first.id}
            ville={first.nom}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            imageLoading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Calendar className="h-8 w-8 text-[var(--color-accent-start)]" strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
        <p className="font-title text-lg font-bold leading-snug text-white/95">
          {voyage.titre}
        </p>
        <p className="mt-1 font-courier text-sm text-white/40">{voyage.sousTitre}</p>
        <p className="mt-2 font-courier text-xs text-white/30">
          {voyage.steps.length} étapes · créé le{" "}
          {new Date(voyage.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </Link>
  );
}

function EmptyVoyageSlot({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 py-14 text-center">
      <p className="font-courier text-sm text-white/35">{text}</p>
    </div>
  );
}
