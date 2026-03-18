import { fetchPhotosByConcepts } from "../../../lib/commons-api";

/** Test Bordeaux : 3 concepts × 6 photos, requêtes FR + EN en parallèle. */
const BORDEAUX_CONCEPTS = [
  {
    label: "Vue générale",
    queries: ["Bordeaux", "Bordeaux France"],
  },
  {
    label: "Place de la Bourse / Miroir d'eau",
    queries: ["Bordeaux place de la Bourse", "Bordeaux mirror water", "Bordeaux miroir"],
  },
  {
    label: "Cathédrale Saint-André",
    queries: ["Bordeaux cathédrale", "Bordeaux cathedral", "Bordeaux Saint-André"],
  },
];

export default async function SelectionPhotosPage() {
  const lieux = await fetchPhotosByConcepts(BORDEAUX_CONCEPTS, 6);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-medium text-[#333]">Bordeaux — test recherche (3 × 6 photos)</h1>
      <p className="mt-2 text-sm text-[#333]/70">
        Requêtes FR + EN en parallèle. Charge un peu au premier affichage.
      </p>

      {lieux.map(({ label, photos }) => (
        <section key={label} className="mt-10">
          <h2 className="mb-4 text-lg font-medium text-[#333]">{label}</h2>
          <div className="flex flex-wrap gap-4">
            {photos.map((p) => (
              <img
                key={p.url}
                src={p.url}
                alt=""
                className="h-48 w-64 rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
