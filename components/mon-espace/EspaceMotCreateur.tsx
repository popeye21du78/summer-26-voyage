"use client";

import { BookOpen } from "lucide-react";
import MoodboardPicker from "./MoodboardPicker";

export default function EspaceMotCreateur() {
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

        <div className="mt-4 flex flex-wrap gap-2">
          {["Philosophie", "FAQ", "Articles"].map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-full border border-[var(--color-glass-border)] px-3 py-1.5 font-courier text-[10px] font-bold text-[var(--color-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_40%,transparent)] hover:text-[var(--color-accent-start)]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
