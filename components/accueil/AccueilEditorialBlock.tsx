"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AccueilEditorialBlock() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <BookOpen className="h-4 w-4 shrink-0 text-[#E07856]/70" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-courier text-xs leading-snug text-white/50">
          Mot du créateur
        </p>
        <p className="truncate font-courier text-[13px] leading-snug text-white/80">
          Viago, c'est le carnet que j'aurais voulu avoir sur la route.
        </p>
      </div>
      <Link
        href="/mon-espace"
        className="shrink-0 font-courier text-[10px] font-bold uppercase tracking-wider text-[#E07856]/70 transition hover:text-[#E07856]"
      >
        Lire
      </Link>
    </div>
  );
}
