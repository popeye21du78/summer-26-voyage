"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import MoodboardPicker from "./MoodboardPicker";

export default function EspaceMotCreateur() {
  const sp = useSearchParams();
  const tabFromUrl = sp.get("marqueTab");
  const articleFromUrl = sp.get("article");
  const initialTab =
    tabFromUrl === "faq" || tabFromUrl === "articles" ? tabFromUrl : "philosophie";
  const [tab, setTab] = useState<"philosophie" | "faq" | "articles">(
    initialTab
  );

  const articles = useMemo(
    () => [
      {
        id: "route-lente",
        title: "Route lente: pourquoi Viago évite le mode checklist",
        excerpt:
          "Un parti-pris simple: moins de bruit, plus de repères utiles pour voyager vraiment.",
      },
      {
        id: "notes-feu",
        title: "Carnet du feu de camp: la photo comme mémoire",
        excerpt:
          "Comment les photos annotées dans Viago servent de journal vivant, pas de galerie figée.",
      },
      {
        id: "stars-amis",
        title: "Stars, Amis, Carte: un seul fil de découverte",
        excerpt:
          "Trois portes d'entrée, mais une même logique: transformer l'inspiration en itinéraire concret.",
      },
    ],
    []
  );

  return (
    <section className="space-y-6 px-5 py-6 pb-12">
      <MoodboardPicker />

      <div>
        <h2 className="mb-4 flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
          <BookOpen className="h-4 w-4" />
          Mot du créateur
        </h2>
        <div className="viago-glass-card p-5">
          <p className="font-courier text-sm leading-relaxed text-[var(--color-text-primary)]/80">
            J&apos;ai bâti cette app comme un regard : des idées concrètes, une carte
            qui respire, et la place pour les détails qui comptent — ceux qu&apos;on
            note le soir au feu de camp.
          </p>
          <p className="mt-3 font-courier text-xs italic text-[var(--color-text-secondary)]">
            La route est à toi ; Viago ne fait qu&apos;ouvrir les pages.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-3">
          <div className="relative h-16 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <Image src="/A4.png" alt="Viago" fill className="object-contain p-2" />
          </div>
          <div className="relative h-16 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <Image
              src="/A5.png"
              alt="V Viago"
              fill
              className="object-contain p-3"
              style={{ filter: "var(--logo-filter-hero-center)" }}
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="font-courier text-[10px] text-white/65">
              Logos temporaires de marque
            </p>
            <p className="mt-1 font-courier text-[9px] text-white/45">
              A4 (complet), A5 (monogramme V)
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "philosophie", label: "Philosophie" },
            { id: "faq", label: "FAQ" },
            { id: "articles", label: "Articles" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setTab(item.id as "philosophie" | "faq" | "articles")
              }
              className="rounded-full border border-[var(--color-glass-border)] px-3 py-1.5 font-courier text-[10px] font-bold text-[var(--color-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_40%,transparent)] hover:text-[var(--color-accent-start)]"
              aria-pressed={tab === item.id}
              style={
                tab === item.id
                  ? {
                      borderColor: "color-mix(in srgb, var(--color-accent-start) 45%, transparent)",
                      color: "var(--color-accent-start)",
                      background: "color-mix(in srgb, var(--color-accent-start) 10%, transparent)",
                    }
                  : undefined
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          {tab === "philosophie" && (
            <div className="space-y-3">
              <p className="font-courier text-sm text-white/85">
                Viago n&apos;est pas un moteur qui decide a ta place. C&apos;est un carnet
                de bord qui garde le cap: voir, choisir, partir.
              </p>
              <p className="font-courier text-sm text-white/65">
                Notre principe: chaque fonctionnalite doit reduire l&apos;hesitation
                sans effacer la liberte. On prefere un bon choix concret a dix
                options spectaculaires.
              </p>
            </div>
          )}

          {tab === "faq" && (
            <div className="space-y-4">
              <div>
                <p className="font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                  Pourquoi des contenus scriptes ?
                </p>
                <p className="mt-1 font-courier text-sm text-white/70">
                  Pour garder la cohérence éditoriale et des écrans rapides sans
                  dépendre d&apos;une génération runtime.
                </p>
              </div>
              <div>
                <p className="font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                  Les POI sont-ils personnalisés ?
                </p>
                <p className="mt-1 font-courier text-sm text-white/70">
                  Oui via tes filtres, favoris et points connus. Le socle reste
                  commun, l&apos;ordre s&apos;adapte.
                </p>
              </div>
              <div>
                <p className="font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
                  A quoi servent Stars et Amis ?
                </p>
                <p className="mt-1 font-courier text-sm text-white/70">
                  A passer d&apos;une envie à un trajet plausible, puis a ton propre
                  Viago en un flux continu.
                </p>
              </div>
            </div>
          )}

          {tab === "articles" && (
            <div className="space-y-3">
              {articles.map((a) => (
                <article
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    articleFromUrl === a.id
                      ? "border-[var(--color-accent-start)]/55 bg-[var(--color-accent-start)]/10"
                      : "border-white/10 bg-black/15"
                  }`}
                >
                  <p className="font-courier text-xs font-bold text-[var(--color-accent-start)]">
                    Article temporaire
                  </p>
                  <h3 className="mt-1 font-courier text-sm font-bold text-white/88">
                    {a.title}
                  </h3>
                  <p className="mt-1 font-courier text-xs text-white/65">
                    {a.excerpt}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
