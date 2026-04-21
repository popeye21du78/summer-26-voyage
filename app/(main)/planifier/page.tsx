import Link from "next/link";
import { Sparkles, MapPinned, Route, MapPin, Heart } from "lucide-react";

export default function PlanifierHubPage() {
  return (
    <main className="page-under-header mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-courier text-2xl font-bold text-[#333]">Planifier un voyage</h1>
      <p className="mt-2 font-courier text-sm text-[#333]/85">
        Choisis un point d’entrée. Le moteur décompose le problème : espace de voyage, nuits, puis
        enrichissements locaux.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/planifier/inspiration"
            className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-accent-start)]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[var(--color-accent-end)] shadow-sm transition hover:border-[var(--color-accent-start)]"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
            Trouver l’inspiration
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/zone"
            className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-accent-start)]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[var(--color-accent-end)] shadow-sm transition hover:border-[var(--color-accent-start)]"
          >
            <MapPinned className="h-6 w-6 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
            Créer dans une zone
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/axe"
            className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-accent-start)]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[var(--color-accent-end)] shadow-sm transition hover:border-[var(--color-accent-start)]"
          >
            <Route className="h-6 w-6 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
            Départ → arrivée
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/lieux"
            className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-accent-start)]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[var(--color-accent-end)] shadow-sm transition hover:border-[var(--color-accent-start)]"
          >
            <MapPin className="h-6 w-6 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
            Autour de lieux choisis
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/favoris"
            className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-accent-end)]/25 bg-white/60 p-4 font-courier text-sm font-bold text-[var(--color-accent-end)] transition hover:bg-[#FFF2EB]"
          >
            <Heart className="h-6 w-6 shrink-0 text-[var(--color-accent-start)]" aria-hidden />
            Coups de cœur
          </Link>
        </li>
      </ul>
      <Link
        href="/accueil#on-repart"
        className="mt-10 inline-block font-courier text-sm text-[var(--color-accent-end)] underline"
      >
        Retour à l’accueil
      </Link>
      <p className="mt-4">
        <Link
          href="/planifier/commencer"
          className="font-courier text-sm font-bold text-[var(--color-accent-end)] underline"
        >
          Hub « Commencer un voyage » (tous les modes)
        </Link>
      </p>
    </main>
  );
}
