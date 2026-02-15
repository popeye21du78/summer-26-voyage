import Link from "next/link";

export default function NouveauVoyagePage() {
  return (
    <main className="px-4 py-12">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">Créer un voyage</h1>
      <p className="mb-8 text-[#333333]/80">
        La création d’un nouveau voyage sera bientôt disponible. En attendant, tu peux consulter tes voyages existants.
      </p>
      <Link
        href="/mes-voyages"
        className="inline-block rounded-lg bg-[#A55734] px-4 py-3 font-medium text-white transition hover:bg-[#8b4728]"
      >
        Voir mes voyages
      </Link>
    </main>
  );
}
