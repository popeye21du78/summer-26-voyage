import Link from "next/link";
import { ArrowRight, Compass, MapPinned, Sparkles } from "lucide-react";

const cards = [
  {
    href: "/planning",
    title: "Planning",
    line: "Étapes, dates, carte",
    icon: MapPinned,
    accent: "from-[#E07856] to-[#D4635B]",
  },
  {
    href: "/planifier/inspiration",
    title: "Inspiration",
    line: "Carte France & parcours",
    icon: Compass,
    accent: "from-[#5D3A1A] to-[#A55734]",
  },
  {
    href: "/mes-voyages",
    title: "Mes voyages",
    line: "Brouillons & suivis",
    icon: Sparkles,
    accent: "from-[#2d6a6a] to-[#1a4a4a]",
  },
] as const;

export default function ItinerairePage() {
  return (
    <main className="page-under-header relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(224,120,86,0.45), transparent 55%), radial-gradient(ellipse 70% 45% at 90% 30%, rgba(165,87,52,0.35), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(45,106,106,0.2), transparent 45%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-lg flex-col gap-8 px-4 py-12 md:py-16">
        <header className="space-y-2">
          <h1 className="font-courier text-3xl font-bold tracking-tight text-[#333] md:text-4xl">
            Itinéraire
          </h1>
          <p className="max-w-md font-courier text-sm text-[#333]/75">
            Ouvre l’outil qui t’intéresse — pas de blabla.
          </p>
        </header>

        <ul className="flex flex-col gap-4">
          {cards.map(({ href, title, line, icon: Icon, accent }) => (
            <li key={href}>
              <Link
                href={href}
                className={`group flex items-center gap-4 overflow-hidden rounded-2xl border border-[#A55734]/15 bg-white/90 p-4 shadow-md backdrop-blur-sm transition hover:border-[#E07856]/35 hover:shadow-lg`}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-inner`}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-courier text-lg font-bold text-[#333]">{title}</p>
                  <p className="font-courier text-xs text-[#333]/65">{line}</p>
                </div>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-[#A55734]/45 transition group-hover:translate-x-0.5 group-hover:text-[#E07856]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-center font-courier text-[11px] text-[#333]/45">
          <Link href="/accueil" className="text-[#A55734] underline underline-offset-2 hover:no-underline">
            Accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
