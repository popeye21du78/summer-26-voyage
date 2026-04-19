"use client";

import InspirationMapScreen from "@/components/planifier/inspiration/InspirationMapScreen";

type Props = { mapboxAccessToken: string | undefined };

export default function InspirerCarteWrapper({ mapboxAccessToken }: Props) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <InspirationMapScreen mapboxAccessToken={mapboxAccessToken} />
    </div>
  );
}
