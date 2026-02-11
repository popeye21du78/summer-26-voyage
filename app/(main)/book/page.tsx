"use client";

import { useState, useEffect } from "react";
import { mockBookSections } from "../../../data/mock-book-sections";
import BookSectionCity from "../../../components/BookSectionCity";
import type { BookSection } from "../../../types";
import type { Step } from "../../../types";

export default function BookPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/steps").then((r) => r.json()),
      fetch("/api/book/sections").then((r) => r.json()),
    ])
      .then(([stepsData, sectionsData]) => {
        if (Array.isArray(stepsData.steps)) setSteps(stepsData.steps);
        if (Array.isArray(sectionsData.sections)) setSections(sectionsData.sections);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displaySections = sections.length > 0 ? sections : mockBookSections;

  return (
    <main className="bg-[#FAF4F0]">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-light text-[#333333] md:text-5xl">
          The Book
        </h1>
        <p className="mt-4 text-[#333333]/70">
          Carnet de voyage – Summer 26
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <p className="text-[#333333]/70">Chargement…</p>
        </div>
      ) : (
        steps.map((step, index) => {
          const section = displaySections.find((s) => s.step_id === step.id);
          if (!section) return null;
          const stepPhotos = step.contenu_voyage?.photos ?? [];
          const sectionPhotos = Array.isArray(section.photos) ? section.photos : [];
          const allPhotos =
            sectionPhotos.length > 0
              ? sectionPhotos
              : stepPhotos.length > 0
                ? stepPhotos
                : sectionPhotos;
          const mergedSection: BookSection = {
            ...section,
            photos: allPhotos,
          };
          return (
            <div key={step.id}>
              {index > 0 && <div className="brush-divider" aria-hidden />}
              <BookSectionCity
                step={step}
                section={mergedSection}
                index={index}
              />
            </div>
          );
        })
      )}

      <div className="h-24" />
    </main>
  );
}
