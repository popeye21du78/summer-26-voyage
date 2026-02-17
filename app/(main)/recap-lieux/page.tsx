import { getLieuxStats } from "../../../lib/lieux-central";
import Link from "next/link";

export default function RecapLieuxPage() {
  const stats = getLieuxStats();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">
        Récap des lieux
      </h1>
      <p className="mb-6 text-[#333333]/80">
        Nombre de sites par département et par catégorie (source :{" "}
        <code className="rounded bg-[#FFF2EB] px-1">lieux-central.xlsx</code>).
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-[#333333]">
          Par catégorie
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-4 text-center">
            <div className="text-2xl font-semibold text-[#a8987a]">{stats.byType.patrimoine}</div>
            <div className="text-sm text-[#333333]/80">Patrimoine</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-4 text-center">
            <div className="text-2xl font-semibold text-[#6b8e6b]">{stats.byType.pepite}</div>
            <div className="text-sm text-[#333333]/80">Pépites</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-4 text-center">
            <div className="text-2xl font-semibold text-[#4a90d9]">{stats.byType.plage}</div>
            <div className="text-sm text-[#333333]/80">Plages</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/20 bg-white p-4 text-center">
            <div className="text-2xl font-semibold text-[#8B6914]">{stats.byType.rando}</div>
            <div className="text-sm text-[#333333]/80">Randos</div>
          </div>
          <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB] p-4 text-center">
            <div className="text-2xl font-semibold text-[#A55734]">{stats.byType.total}</div>
            <div className="text-sm text-[#333333]/80">Total</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-[#333333]">
          Par département (région)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#A55734]/20 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#A55734]/20 bg-[#FFF2EB]/50">
                <th className="px-4 py-3 font-medium text-[#333333]">Code</th>
                <th className="px-4 py-3 font-medium text-[#333333]">Département</th>
                <th className="px-4 py-3 text-center font-medium text-[#333333]">Patrimoine</th>
                <th className="px-4 py-3 text-center font-medium text-[#333333]">Pépites</th>
                <th className="px-4 py-3 text-center font-medium text-[#333333]">Plages</th>
                <th className="px-4 py-3 text-center font-medium text-[#333333]">Randos</th>
                <th className="px-4 py-3 text-center font-medium text-[#333333]">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.byDepartement.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#333333]/60">
                    Aucun lieu dans lieux-central.xlsx pour l’instant.
                  </td>
                </tr>
              ) : (
                stats.byDepartement.map((d) => (
                  <tr
                    key={d.code_dep}
                    className="border-b border-[#A55734]/10 hover:bg-[#FFF2EB]/30"
                  >
                    <td className="px-4 py-2 font-mono text-[#333333]">{d.code_dep}</td>
                    <td className="px-4 py-2 text-[#333333]">{d.departement}</td>
                    <td className="px-4 py-2 text-center text-[#333333]">{d.patrimoine}</td>
                    <td className="px-4 py-2 text-center text-[#333333]">{d.pepite}</td>
                    <td className="px-4 py-2 text-center text-[#333333]">{d.plage}</td>
                    <td className="px-4 py-2 text-center text-[#333333]">{d.rando}</td>
                    <td className="px-4 py-2 text-center font-medium text-[#333333]">{d.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-sm text-[#333333]/70">
        <Link href="/carte-villes" className="underline hover:text-[#A55734]">
          Voir la carte des lieux
        </Link>
      </p>
    </main>
  );
}
