"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  /** ex. py-2.5 pour aligner avec une ligne plus haute */
  inputClassName?: string;
};

/**
 * Champ recherche unique pour les onglets S’inspirer (Carte, Stars, Amis) :
 * même style sombre, bordure discrète, focus orange.
 */
export default function InspirerSearchField({
  value,
  onChange,
  placeholder = "Rechercher…",
  id,
  inputClassName = "py-2",
}: Props) {
  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-accent-start)]/45"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 font-courier text-[11px] text-white placeholder:text-white/25 focus:border-[var(--color-accent-start)]/35 focus:outline-none ${inputClassName}`}
        autoComplete="off"
      />
    </label>
  );
}
