import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#FAF4F0]">
      <section
        className="relative flex min-h-screen flex-col items-center justify-center px-4"
        aria-label="Mode démo"
      >
        <div className="relative z-10 max-w-md text-center">
          <h1 className="mb-4 text-3xl font-light text-[#333333]">
            Tester l&apos;app
          </h1>
          <p className="mb-8 text-[#333333]/80">
            Vous êtes en mode démo. Explorez la carte et le parcours sans vous connecter.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="rounded-lg border-2 border-[#A55734] bg-transparent px-6 py-2.5 text-sm font-normal text-[#A55734] transition hover:bg-[#A55734]/10"
            >
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#A55734] px-6 py-2.5 text-sm font-normal text-white transition hover:bg-[#8b4728]"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
