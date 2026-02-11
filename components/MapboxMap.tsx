"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

// Centre et zoom pour cadrer Paris → Bordeaux → Biarritz (déduit des mock steps)
const DEFAULT_CENTER = { longitude: 0.4, latitude: 46.2 };
const DEFAULT_ZOOM = 5.5;
const MIN_ZOOM = 5;
const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41],
  [9.5, 51.5],
];
const MAX_ZOOM = 14; // permet de zoomer jusqu'à ~10 km

const MapboxMapInner = dynamic(
  () => import("./MapboxMapInner"),
  { ssr: false }
);

export default function MapboxMap() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const hasToken = Boolean(token?.trim());

  const initialViewState = useMemo(
    () => ({
      ...DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    }),
    []
  );

  if (!hasToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFFFF] px-4 text-[#333333]">
        <p className="text-center font-medium">
          Pour afficher la carte, ajoutez votre token Mapbox.
        </p>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>
            Créez un compte gratuit sur{" "}
            <a
              href="https://account.mapbox.com/auth/signup/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A55734] underline"
            >
              account.mapbox.com
            </a>
          </li>
          <li>
            Allez dans{" "}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A55734] underline"
            >
              Access tokens
            </a>{" "}
            et copiez le token par défaut (ou créez-en un).
          </li>
          <li>
            À la racine du projet, créez un fichier{" "}
            <code className="rounded bg-white/80 px-1 py-0.5">.env.local</code>{" "}
            avec la ligne :
            <br />
            <code className="mt-1 block rounded bg-white/80 p-2 text-left">
              NEXT_PUBLIC_MAPBOX_TOKEN=votre_token_ici
            </code>
          </li>
          <li>Redémarrez le serveur (arrêtez puis relancez <code>npm run dev</code>).</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[400px]">
      <MapboxMapInner
        mapboxAccessToken={token!}
        initialViewState={initialViewState}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={FRANCE_BOUNDS}
        mapStyle="mapbox://styles/mapbox/light-v11"
      />
    </div>
  );
}
