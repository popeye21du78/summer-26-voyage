"use client";

import { InspirationMapProvider } from "@/lib/inspiration-map-context";
import InspirationMapScreen from "@/components/planifier/inspiration/InspirationMapScreen";

type Props = { mapboxAccessToken: string | undefined };

export default function InspirerCarteWrapper({ mapboxAccessToken }: Props) {
  return (
    <InspirationMapProvider>
      <div className="h-full min-h-0 min-w-0">
        <InspirationMapScreen mapboxAccessToken={mapboxAccessToken} />
      </div>
    </InspirationMapProvider>
  );
}
