import { Suspense } from "react";
import StarItineraryScreen from "@/components/inspirer/StarItineraryScreen";

type Props = { params: Promise<{ slug: string }> };

export default async function StarItinerairePage({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense>
      <StarItineraryScreen slug={slug} />
    </Suspense>
  );
}
