"use client";

import { BookOpen } from "lucide-react";

export default function EspaceMotCreateur() {
  return (
    <section className="px-5 py-6 pb-12">
      <h2 className="mb-4 flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-wider text-[#E07856]">
        <BookOpen className="h-4 w-4" />
        Mot du créateur
      </h2>
      <div className="rounded-2xl border border-white/6 bg-white/3 p-5">
        <p className="font-courier text-sm leading-relaxed text-white/70">
          J&apos;ai bâti cette app comme un regard : des idées concrètes, une carte
          qui respire, et la place pour les détails qui comptent — ceux qu&apos;on
          note le soir au feu de camp.
        </p>
        <p className="mt-3 font-courier text-xs italic text-white/35">
          La route est à toi ; Viago ne fait qu&apos;ouvrir les pages.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Philosophie", "FAQ", "Articles"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-full border border-white/8 px-3 py-1.5 font-courier text-[10px] font-bold text-white/35 transition hover:border-[#E07856]/30 hover:text-[#E07856]/70"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
