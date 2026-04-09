"use client";

import { LieuResolvedBackground } from "./LieuResolvedBackground";

type Props = {
  stepId: string;
  nom: string;
  className?: string;
  /** Ex. `rounded-md`, `rounded-lg`, `rounded-full` */
  roundedClassName?: string;
};

/**
 * Vignette lieu (validations + Wikipédia / Commons…) — remplace les URLs mock dans les listes / cartes.
 */
export function StepLieuThumb({
  stepId,
  nom,
  className = "",
  roundedClassName = "rounded-md",
}: Props) {
  return (
    <LieuResolvedBackground
      ville={nom}
      stepId={stepId}
      className={`${roundedClassName} ${className}`.trim()}
    />
  );
}
