import { getLieuxFromCentral, getDepartementsList } from "../../../lib/lieux-central";
import CarteVillesMapClient from "../../../components/CarteVillesMapClient";

export default async function CarteVillesPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasToken = Boolean(token?.trim());
  const lieux = getLieuxFromCentral();
  const departements = getDepartementsList();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">
        Carte des lieux
      </h1>
      <p className="mb-6 text-[#333333]/80">
        {lieux.length} lieu{lieux.length > 1 ? "x" : ""} (patrimoine, pépites, plages, randos) —
        source : <code className="rounded bg-[#FFF2EB] px-1">data/cities/lieux-central.xlsx</code>.
        Filtre par département et par catégorie.{" "}
        <a href="/recap-lieux" className="underline hover:text-[#A55734]">Récap par région et catégorie</a>.
      </p>
      {!hasToken ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[#333333]">
          <p className="font-medium">Token Mapbox requis</p>
          <p className="mt-1 text-sm">
            Ajoutez <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> dans{" "}
            <code>.env.local</code> pour afficher la carte.
          </p>
        </div>
      ) : (
        <CarteVillesMapClient
          lieux={lieux}
          departements={departements}
          mapboxAccessToken={token}
        />
      )}
    </main>
  );
}
