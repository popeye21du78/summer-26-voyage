"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { LieuPoint, LieuType } from "../lib/lieux-types";

const CitiesMapView = dynamic(
  () => import("./CitiesMapView"),
  { ssr: false }
);

const TYPE_LABELS: Record<LieuType, string> = {
  patrimoine: "Patrimoine",
  pepite: "Pépites",
  plage: "Plages",
  rando: "Randos",
};

type CarteVillesMapClientProps = {
  lieux: LieuPoint[];
  departements: { code: string; departement: string }[];
  mapboxAccessToken: string | undefined;
};

export default function CarteVillesMapClient({
  lieux,
  departements,
  mapboxAccessToken,
}: CarteVillesMapClientProps) {
  const [selectedCodeDep, setSelectedCodeDep] = useState<string>("");
  const [typesVisible, setTypesVisible] = useState<Record<LieuType, boolean>>({
    patrimoine: true,
    pepite: true,
    plage: true,
    rando: true,
  });
  const hasToken = Boolean(mapboxAccessToken?.trim());

  const lieuxFiltered = useMemo(() => {
    let list = lieux;
    if (selectedCodeDep.trim()) list = list.filter((l) => l.code_dep === selectedCodeDep);
    return list.filter((l) => typesVisible[l.type]);
  }, [lieux, selectedCodeDep, typesVisible]);

  if (!hasToken) return null;

  const toggleType = (t: LieuType) => setTypesVisible((prev) => ({ ...prev, [t]: !prev[t] }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#333333]">Département :</span>
          <select
            id="dep-select"
            value={selectedCodeDep}
            onChange={(e) => setSelectedCodeDep(e.target.value)}
            className="rounded border border-[#A55734]/30 bg-white px-3 py-1.5 text-sm text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/50"
          >
            <option value="">Tous</option>
            {departements.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.departement}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-[#333333]">Catégories :</span>
          {(Object.keys(TYPE_LABELS) as LieuType[]).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-1.5 text-sm text-[#333333]">
              <input
                type="checkbox"
                checked={typesVisible[t]}
                onChange={() => toggleType(t)}
                className="h-3.5 w-3.5 rounded border-[#A55734]/50"
              />
              <span>{TYPE_LABELS[t]}</span>
            </label>
          ))}
        </div>
        <span className="text-sm text-[#333333]/70">
          {lieuxFiltered.length} lieu{lieuxFiltered.length !== 1 ? "x" : ""} affiché{lieuxFiltered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-[500px] w-full">
        <CitiesMapView
          lieux={lieuxFiltered}
          mapboxAccessToken={mapboxAccessToken!}
        />
      </div>
    </div>
  );
}
