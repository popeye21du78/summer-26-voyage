import Link from "next/link";

/** Ancienne page de test du générateur d’itinéraire (supprimé). */
export default function ItinerairePage() {
  return (
    <main className="page-under-header mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-3 font-courier text-2xl font-bold text-[#333333]">
        Itinéraire automatique
      </h1>
      <p className="mb-6 font-courier text-sm leading-relaxed text-[#333333]/85">
        L&apos;outil expérimental (carte + génération multi-jours) n&apos;est plus dans le projet. Le planning
        des étapes passe par la page Planning et la table Supabase, comme avant.
      </p>
      <div className="flex flex-wrap gap-3 font-courier text-sm font-bold">
        <Link href="/planning" className="text-[#A55734] underline hover:no-underline">
          Planning
        </Link>
        <Link href="/accueil" className="text-[#A55734] underline hover:no-underline">
          Accueil
        </Link>
      </div>
    </main>
  );
}
