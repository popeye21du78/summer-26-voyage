import { notFound } from "next/navigation";
import { getTerritoryById } from "@/lib/editorial-territories";
import TerritoryDetailClient from "@/components/planifier/TerritoryDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function TerritoryDetailPage({ params }: Props) {
  const { id } = await params;
  const territory = getTerritoryById(id);
  if (!territory) notFound();
  return <TerritoryDetailClient territory={territory} />;
}
