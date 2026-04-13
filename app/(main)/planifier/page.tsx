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
            className="flex items-center gap-3 rounded-xl border-2 border-[#E07856]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[#A55734] shadow-sm transition hover:border-[#E07856]"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
            Trouver l’inspiration
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/zone"
            className="flex items-center gap-3 rounded-xl border-2 border-[#E07856]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[#A55734] shadow-sm transition hover:border-[#E07856]"
          >
            <MapPinned className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
            Créer dans une zone
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/axe"
            className="flex items-center gap-3 rounded-xl border-2 border-[#E07856]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[#A55734] shadow-sm transition hover:border-[#E07856]"
          >
            <Route className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
            Départ → arrivée
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/lieux"
            className="flex items-center gap-3 rounded-xl border-2 border-[#E07856]/35 bg-white/90 p-4 font-courier text-sm font-bold text-[#A55734] shadow-sm transition hover:border-[#E07856]"
          >
            <MapPin className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
            Autour de lieux choisis
          </Link>
        </li>
        <li>
          <Link
            href="/planifier/favoris"
            className="flex items-center gap-3 rounded-xl border-2 border-[#A55734]/25 bg-white/60 p-4 font-courier text-sm font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
          >
            <Heart className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
            Coups de cœur
          </Link>
        </li>
      </ul>
      <Link
        href="/accueil#on-repart"
        className="mt-10 inline-block font-courier text-sm text-[#A55734] underline"
      >
        Retour à l’accueil
      </Link>
      <p className="mt-4">
        <Link
          href="/planifier/commencer"
          className="font-courier text-sm font-bold text-[#A55734] underline"
        >
          Hub « Commencer un voyage » (tous les modes)
        </Link>
      </p>
    </main>
  );
}
