import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Lien direct vers une région → ouvre la sheet tirable sur l'onglet carte. */
export default async function RegionPage({ params }: Props) {
  const { id } = await params;
  redirect(`/inspirer?tab=carte&region=${encodeURIComponent(id)}`);
}
