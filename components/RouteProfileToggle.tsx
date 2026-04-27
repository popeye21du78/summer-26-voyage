"use client";

import { Car, Bike } from "lucide-react";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";

type Props = {
  value: MapboxRouteProfile;
  onChange: (p: MapboxRouteProfile) => void;
  className?: string;
};

/**
 * Bascule voiture / vélo pour le calcul d’itinéraire Mapbox (Directions driving vs cycling).
 */
export function RouteProfileToggle({ value, onChange, className = "" }: Props) {
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
        <Car className="h-3.5 w-3.5" />
        Voiture
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
        Vélo
      </button>
    </div>
  );
}
