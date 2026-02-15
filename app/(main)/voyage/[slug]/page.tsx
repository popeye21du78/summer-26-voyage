import MapSection from "../../../../components/MapSection";
import HeroButtons from "../../../../components/HeroButtons";

// Pour l’instant un seul voyage ; plus tard titre/sousTitre depuis BDD ou config
const VOYAGES: Record<string, { titre: string; sousTitre: string }> = {
  "summer-26": { titre: "Summer 26", sousTitre: "Préfailles → Marseille. Ton carnet de voyage van-life." },
};

export default async function VoyagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const voyage = slug ? VOYAGES[slug] : null;

  if (!voyage) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-[#333333]/80">Voyage introuvable.</p>
      </main>
    );
  }

  return (
    <main>
      <section
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-32"
        aria-label={voyage.titre}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAF4F0]" />
        <div className="relative z-10">
          <h1 className="mb-4 text-center text-5xl font-light text-[#333333] md:text-6xl">
            {voyage.titre}
          </h1>
          <p className="mb-8 max-w-lg text-center text-lg text-[#333333]/80">
            {voyage.sousTitre}
          </p>
          <HeroButtons />
        </div>
      </section>

      <div
        className="pointer-events-none relative h-24 w-full bg-gradient-to-b from-[#FAF4F0] to-[#FAF4F0]/0"
        aria-hidden
      />

      <section id="carte" className="relative z-0 -mt-24">
        <MapSection />
        <span id="carte-bas" className="block h-px" aria-hidden />
      </section>
    </main>
  );
}
