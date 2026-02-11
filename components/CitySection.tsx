"use client";

import { useState, useCallback } from "react";

/** Conversion Markdown minimal → HTML (sans dépendance react-markdown). */
function markdownToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let html = esc(md)
    .replace(/^### (.+)$/gm, "<h3 class=\"text-lg font-medium text-[#A55734] mt-4 mb-1\">$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-xl font-medium text-[#A55734] mt-4 mb-2\">$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class=\"text-2xl font-medium text-[#A55734] mt-4 mb-2\">$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold text-[#333333]\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, "<ul class=\"my-2 space-y-1\">$&</ul>")
    .replace(/\n\n+/g, "</p><p class=\"my-2 text-[#333333]/90\">")
    .replace(/\n/g, "<br/>");
  return "<p class=\"my-2 text-[#333333]/90\">" + html + "</p>";
}

export type SectionType =
  | "atmosphere"
  | "chroniques"
  | "guide_epicurien"
  | "radar_van"
  | "anecdote";

const SECTION_LABELS: Record<SectionType, string> = {
  atmosphere: "Atmosphère & Vibe",
  chroniques: "Chroniques du Temps",
  guide_epicurien: "Le Guide Épicurien",
  radar_van: "Radar Van-Life",
  anecdote: "L'Anecdote ou Le Secret",
};

interface CitySectionProps {
  stepId: string;
  ville: string;
  sectionType: SectionType;
  initialContent?: string | null;
}

export function CitySection({
  stepId,
  ville,
  sectionType,
  initialContent,
}: CitySectionProps) {
  const [content, setContent] = useState<string | null>(initialContent ?? null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!!initialContent);
  const [error, setError] = useState(false);

  const fetchContent = useCallback(() => {
    setLoading(true);
    setError(false);

    fetch("/api/section-ville", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        ville,
        sectionType,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur de génération");
        return res.json();
      })
      .then((data: { content?: string }) => {
        setContent(data.content ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [stepId, ville, sectionType]);

  const handleToggle = () => {
    if (!open) {
      setOpen(true);
      if (!content && !loading) fetchContent();
    } else {
      setOpen(false);
    }
  };

  const label = SECTION_LABELS[sectionType];

  return (
    <div className="border-b border-[#A55734]/20 last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-[#A55734]"
        aria-expanded={open}
      >
        <span className="font-medium text-[#333333]">{label}</span>
        <span
          className={`text-[#A55734] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-4">
          {loading && (
            <div className="flex min-h-[120px] flex-col items-center justify-center py-8">
              <span className="voyage-loading-text text-sm sm:text-base">
                voyage voyage
              </span>
            </div>
          )}
          {error && (
            <p className="py-4 text-sm text-red-600">
              Erreur de génération.{" "}
              <button
                type="button"
                onClick={fetchContent}
                className="underline hover:no-underline"
              >
                Réessayer
              </button>
            </p>
          )}
          {content && !loading && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
