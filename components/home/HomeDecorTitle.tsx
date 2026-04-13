"use client";

type Tone = "onLight" | "onDark";

const toneClass: Record<Tone, string> = {
  /** Lisible sur fond crème / blanc cassé */
  onLight:
    "text-[#B85C3D]/[0.38] sm:text-[#A04A32]/[0.32]",
  /** Lisible sur fond brique / sombre chaud */
  onDark: "text-white/[0.34]",
};

/**
 * Filigrane typographique — haut à droite, très gros, lisible (contraste selon le fond).
 */
export default function HomeDecorTitle({
  lines,
  className = "",
  tone = "onLight",
}: {
  lines: string[];
  className?: string;
  /** Contraste du filigrane selon la section. */
  tone?: Tone;
}) {
  return (
    <div
      className={`pointer-events-none absolute right-0 top-0 z-0 flex max-h-[36vh] w-[92%] flex-col items-end overflow-hidden pr-3 pt-3 text-right sm:max-w-[min(92vw,22rem)] ${className}`}
      aria-hidden
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className={`block font-courier text-[13vw] font-bold uppercase leading-[0.86] tracking-tight sm:text-[3.65rem] ${toneClass[tone]}`}
        >
          {line}
        </span>
      ))}
    </div>
  );
}
