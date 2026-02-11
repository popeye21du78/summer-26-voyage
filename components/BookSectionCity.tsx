"use client";

import { useRef } from "react";

function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import type { Step } from "../types";
import type { BookSection } from "../types";

type Props = {
  step: Step;
  section: BookSection;
  index: number;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookSectionCity({ step, section, index }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const style = section.style ?? {};

  const titreClass = [
    "text-4xl md:text-5xl lg:text-6xl",
    "font-light",
    style.gras ? "font-bold" : "font-normal",
    style.italique ? "italic" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sousTitreClass = [
    "text-sm md:text-base tracking-wide opacity-80",
    "font-light",
  ]
    .filter(Boolean)
    .join(" ");

  const layout = section.style?.layout ?? "single";
  const photos = Array.isArray(section.photos) ? section.photos : [];

  return (
    <section
      id={step.id}
      ref={ref}
      className="relative min-h-screen scroll-mt-16"
    >
      {/* Photo full-bleed en fond (hero) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: photos[0] ? `url(${photos[0]})` : undefined,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#FAF4F0]" />
      </motion.div>

      {/* Contenu */}
      <div className="relative flex min-h-screen flex-col justify-end px-4 py-24 md:px-12 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl"
        >
          <h2 className={`${titreClass} text-white drop-shadow-lg`}>
            {step.nom}
          </h2>
          <p className={`mt-2 ${sousTitreClass} text-white drop-shadow-md`}>
            {formatDate(step.date_prevue)}
          </p>
        </motion.div>
      </div>

      {/* Zone texte + galerie */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mx-auto max-w-4xl px-4 py-16 md:px-12 lg:px-24"
      >
        {photos.length > 1 && (
          <div
            className={`mb-12 grid gap-4 ${
              layout === "grid3"
                ? "grid-cols-1 md:grid-cols-3"
                : layout === "grid2"
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1"
            }`}
          >
            {photos.slice(1).map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="polaroid"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {section.texte && (
          <div
            className={`prose prose-lg max-w-none text-[#333333] prose-p:whitespace-pre-wrap [&_h1]:text-3xl [&_h1]:font-light [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:font-bold [&_em]:italic ${
              style.italique ? "italic" : ""
            } ${style.gras ? "font-medium" : ""}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.texte) }}
          />
        )}
      </motion.div>
    </section>
  );
}
