"use client";

import { useState } from "react";
import Image from "next/image";

type PhotoFlipCardProps = {
  frontSrc: string;
  alt: string;
  width: number;
  height: number;
  fullWidth?: boolean;
  /** Rapport largeur/hauteur de la photo pour cadrer exactement (ex: 280/200) */
  aspectRatio?: number;
  tapeClassName?: string;
  tapeStyle?: React.CSSProperties;
  cardClassName?: string;
  textRotation?: number;
  children: React.ReactNode;
};

export default function PhotoFlipCard({
  frontSrc,
  alt,
  width,
  height,
  fullWidth = false,
  aspectRatio: aspectRatioProp,
  tapeClassName = "",
  tapeStyle,
  cardClassName = "",
  textRotation = 0,
  children,
}: PhotoFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const aspectRatio = aspectRatioProp ?? width / height;

  const sizeStyle = fullWidth
    ? { width: "100%", aspectRatio: `${aspectRatio}` }
    : { width, minHeight: height };

  const innerSizeStyle = fullWidth
    ? { width: "100%", height: "100%" }
    : { width, height };

  return (
    <div
      className={`relative shrink-0 cursor-pointer [perspective:800px] ${cardClassName}`}
      style={sizeStyle}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      aria-label={flipped ? "Retourner la photo" : "Voir le texte au dos"}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Face : photo, cadre transparent */}
        <div
          className="relative overflow-hidden rounded-sm bg-transparent shadow-lg [backface-visibility:hidden]"
          style={innerSizeStyle}
        >
          <div
            className={`absolute z-10 rounded-sm bg-[#f5f0e6]/90 shadow-md ${tapeClassName}`}
            style={tapeStyle}
            aria-hidden
          />
          <Image
            src={frontSrc}
            alt={alt}
            fill
            sizes={fullWidth ? "min(95vw, 896px)" : `${width}px`}
            className="rounded-sm object-contain object-center"
          />
        </div>

        {/* Dos : image derriere-photos en entier (cadre carré = même format), texte à l'intérieur de l'image */}
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-sm bg-transparent shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            ...innerSizeStyle,
            backgroundImage: "url(/derriere-photos.jpeg)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {/* Texte contenu dans la zone de l'image (marge pour ne pas déborder) */}
          <div
            className="absolute inset-[8%] flex flex-col justify-center overflow-hidden text-[#333333]"
            style={{
              fontFamily: "var(--font-homemade-apple), cursive",
              transform: `rotate(${textRotation}deg)`,
              fontSize: "clamp(0.95rem, 2.8vw, 1.25rem)",
              lineHeight: 1.45,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
