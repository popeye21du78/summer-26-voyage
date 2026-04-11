"use client";

import { InspirationMapProvider } from "@/lib/inspiration-map-context";
import InspirationMapScreen from "@/components/planifier/inspiration/InspirationMapScreen";

type Props = { mapboxAccessToken: string | undefined };

/**
 * Carte d’inspiration : layout immersif (top bar, carousel, bottom sheets).
 * La logique géographique et les filtres restent branchés via le provider.
 */
export default function InspirationExploreClient({ mapboxAccessToken }: Props) {
  return (
    <InspirationMapProvider>
      <div className="h-full min-h-0 min-w-0">
        <InspirationMapScreen mapboxAccessToken={mapboxAccessToken} />
      </div>
    </InspirationMapProvider>
  );
}
