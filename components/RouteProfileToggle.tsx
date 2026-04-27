"use client";

import type { LucideIcon } from "lucide-react";
import { Car, Bike } from "lucide-react";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";

type Props = {
  value: MapboxRouteProfile;
  onChange: (p: MapboxRouteProfile) => void;
  className?: string;
  /** Remplace « Voiture » (ex. « Van » sur Mon espace). */
  drivingLabel?: string;
  /** Remplace « Vélo » si besoin. */
  cyclingLabel?: string;
  /** Icône pour le profil routier (défaut : voiture). */
  DrivingIcon?: LucideIcon;
};

/**
 * Bascule route (driving) / vélo (cycling) pour le calcul d’itinéraire Mapbox.
 */
export function RouteProfileToggle({
  value,
  onChange,
  className = "",
  drivingLabel = "Voiture",
  cyclingLabel = "Vélo",
  DrivingIcon = Car,
}: Props) {
  return (
    <div
      className={`inline-flex rounded-2xl border border-white/12 bg-white/5 p-1 ${className}`}
      role="group"
      aria-label="Mode d’itinéraire"
    >
      <button
        type="button"
        onClick={() => onChange("driving")}
        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-courier text-[10px] font-bold uppercase tracking-wider transition ${
          value === "driving"
            ? "bg-[var(--color-accent-start)] text-white shadow-md"
            : "text-white/50 hover:text-white/75"
        }`}
        aria-pressed={value === "driving"}
      >
        <DrivingIcon className="h-3.5 w-3.5" />
        {drivingLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("cycling")}
        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-courier text-[10px] font-bold uppercase tracking-wider transition ${
          value === "cycling"
            ? "bg-[var(--color-accent-start)] text-white shadow-md"
            : "text-white/50 hover:text-white/75"
        }`}
        aria-pressed={value === "cycling"}
      >
        <Bike className="h-3.5 w-3.5" />
        {cyclingLabel}
      </button>
    </div>
  );
}
