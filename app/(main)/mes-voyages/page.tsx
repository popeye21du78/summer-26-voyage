import Link from "next/link";

export default function MesVoyagesPage() {
  // Pour l'instant un seul voyage ; plus tard liste depuis Supabase ou mock
  const voyages = [
    { id: "summer-26", titre: "Summer 26", sousTitre: "Préfailles → Marseille", href: "/voyage/summer-26" },
  ];

  return (
    <main className="px-4 py-8">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">Mes voyages</h1>
      <p className="mb-8 text-[#333333]/80">
        Choisis un voyage pour ouvrir son carnet et sa carte.
      </p>
      <ul className="space-y-4">
        {voyages.map((v) => (
          <li key={v.id}>
            <Link
              href={v.href}
              className="block rounded-lg border border-[#A55734]/30 bg-white p-4 transition hover:border-[#A55734] hover:bg-[#A55734]/5"
            >
              <span className="font-medium text-[#333333]">{v.titre}</span>
              <span className="ml-2 text-sm text-[#333333]/70">{v.sousTitre}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
