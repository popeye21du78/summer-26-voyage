"use client";

import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import type { HomeDailyThought, HomeEditorialCard } from "@/lib/home-content";

export default function AccueilEditorialBlock({
  thought,
  editorialCard,
  compact = false,
}: {
  thought?: HomeDailyThought;
  editorialCard?: HomeEditorialCard;
  compact?: boolean;
}) {
  if (!thought && !editorialCard) return null;

  return (
    <div className={`grid gap-3 ${compact ? "pt-4" : ""}`}>
      {thought ? (
        <Link
          href={thought.href}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition hover:bg-white/8"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-start)]/78" />
          <div className="min-w-0 flex-1">
            <p className="font-courier text-[10px] font-bold uppercase tracking-[0.24em] text-white/46">
              Pensée du jour
            </p>
            <p className="mt-1 font-courier text-[13px] leading-snug text-white/82">
              {thought.text}
            </p>
          </div>
        </Link>
      ) : null}
      {editorialCard ? (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-start)]/70" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-courier text-[10px] font-bold uppercase tracking-[0.24em] text-white/46">
              {editorialCard.kicker}
            </p>
            <p className="mt-1 font-courier text-[13px] leading-snug text-white/84">
              {editorialCard.title}
            </p>
            <p className="mt-1 line-clamp-2 font-courier text-xs leading-snug text-white/50">
              {editorialCard.excerpt}
            </p>
          </div>
          <Link
            href={editorialCard.href}
            className="shrink-0 font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/78 transition hover:text-[var(--color-accent-start)]"
          >
            Lire
          </Link>
        </div>
      ) : null}
    </div>
  );
}
