import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Ancienne page « quiz + carte + génération d’itinéraire » (très lourde côté IDE et runtime).
 * Le parcours repart depuis l’accueil : bouton qui révèle une nouvelle section.
 */
export default function NouveauVoyagePage() {
  return (
    <main className="page-under-header mx-auto max-w-lg px-4 py-12 md:py-16">
      <Link
        href="/accueil#on-repart"
        className="mb-6 inline-flex items-center gap-1 font-courier text-sm font-bold text-[#A55734] transition hover:text-[#8b4728]"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Retour à l&apos;accueil
      </Link>
      <h1 className="mb-3 font-courier text-2xl font-bold text-[#333333]">
        Créer un voyage
      </h1>
      <p className="font-courier text-sm leading-relaxed text-[#333333]/85">
        Le questionnaire et l&apos;itinéraire automatique ont été retirés pour repartir sur des bases plus
        simples. Utilise l&apos;accueil : section <strong>Planifier un voyage</strong>, puis le bouton pour
        faire apparaître la prochaine étape.
      </p>
    </main>
  );
}
