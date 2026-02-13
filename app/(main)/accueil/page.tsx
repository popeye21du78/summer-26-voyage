import MapSection from "../../../components/MapSection";
import HeroButtons from "../../../components/HeroButtons";

export default function AccueilPage() {
  return (
    <main>
      {/* Hero plein écran + dégradé */}
      <section
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-32"
        aria-label="Accueil"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAF4F0]" />
        <div className="relative z-10">
          <h1 className="mb-4 text-center text-5xl font-light text-[#333333] md:text-6xl">
            Summer 26
          </h1>
          <p className="mb-8 max-w-lg text-center text-lg text-[#333333]/80">
            Préfailles → Marseille. Ton carnet de voyage van-life.
          </p>
          <HeroButtons />
        </div>
      </section>

      {/* Dégradé de transition vers la carte */}
      <div
        className="pointer-events-none relative h-24 w-full bg-gradient-to-b from-[#FAF4F0] to-[#FAF4F0]/0"
        aria-hidden
      />

      {/* Carte */}
      <section id="carte" className="relative -mt-24">
        <MapSection />
        <span id="carte-bas" className="block h-px" aria-hidden />
      </section>
    </main>
  );
}
