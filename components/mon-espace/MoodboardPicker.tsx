"use client";

import {
  FONT_PRESETS,
  MOODBOARDS,
  useMoodboard,
  type FontPresetId,
  type MoodboardId,
} from "@/components/theme/MoodboardProvider";
import { Check, Palette } from "lucide-react";

/**
 * Sélecteur d'ambiance visuelle (6 moodboards) — utilisé dans Mon espace.
 * Le choix est persisté dans localStorage et appliqué via data-moodboard sur <html>.
 */
export default function MoodboardPicker() {
  const { moodboard, setMoodboard, fontPreset, setFontPreset } = useMoodboard();

  return (
    <section className="viago-glass-card px-4 py-4">
      <header className="mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4 text-[var(--color-accent-start)]" />
        <h3 className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-primary)]">
          Ambiance
        </h3>
      </header>

      <p className="mb-4 font-courier text-xs leading-relaxed text-[var(--color-text-secondary)]">
        Choisis la tonalité qui t&apos;accompagne. Les boutons et accents
        restent toujours en orange.
      </p>

      <ul
        role="radiogroup"
        aria-label="Sélection d'ambiance"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {MOODBOARDS.map((m) => {
          const isActive = moodboard === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setMoodboard(m.id as MoodboardId)}
                className="group relative flex w-full flex-col items-start gap-2 overflow-hidden rounded-2xl border p-3 text-left transition"
                style={{
                  borderColor: isActive
                    ? "var(--color-accent-start)"
                    : "var(--color-glass-border)",
                  background: "var(--color-glass-bg)",
                  boxShadow: isActive
                    ? "0 10px 26px var(--color-shadow), 0 0 0 1px var(--color-accent-start) inset"
                    : "0 6px 16px var(--color-shadow-card)",
                }}
              >
                <div className="flex w-full items-center gap-1.5">
                  {m.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-6 flex-1 rounded-md"
                      style={{
                        backgroundColor: c,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="font-courier text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                    {m.label}
                  </p>
                  <p className="mt-0.5 font-courier text-[10.5px] text-[var(--color-text-secondary)]">
                    {m.sous_titre}
                  </p>
                </div>
                {isActive && (
                  <span
                    className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--gradient-cta)" }}
                    aria-hidden
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <header className="mb-3 mt-5 flex items-center gap-2">
        <Palette className="h-4 w-4 text-[var(--color-accent-start)]" />
        <h3 className="font-courier text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-primary)]">
          Polices globales
        </h3>
      </header>
      <p className="mb-3 font-courier text-xs leading-relaxed text-[var(--color-text-secondary)]">
        Teste 9 paires éditoriales — un aperçu des titres et du contenu s&apos;affiche sur
        chaque carte pour sentir la différence.
      </p>
      <ul
        role="radiogroup"
        aria-label="Sélection de polices"
        className="space-y-2"
      >
        {FONT_PRESETS.map((f) => {
          const isActive = fontPreset === f.id;
          const previewFontFamily = PREVIEW_FONT_FAMILY[f.id];
          const previewContentFamily = PREVIEW_CONTENT_FAMILY[f.id];
          return (
            <li key={f.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setFontPreset(f.id as FontPresetId)}
                className="w-full rounded-xl border p-3 text-left transition"
                style={{
                  borderColor: isActive
                    ? "var(--color-accent-start)"
                    : "var(--color-glass-border)",
                  background: "var(--color-glass-bg)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="text-[18px] font-semibold leading-tight text-[var(--color-text-primary)]"
                    style={{ fontFamily: previewFontFamily }}
                  >
                    Voyage Viago
                  </p>
                  {isActive ? (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: "var(--gradient-cta)" }}
                      aria-hidden
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-1 text-[12px] leading-snug text-[var(--color-text-secondary)]"
                  style={{ fontFamily: previewContentFamily }}
                >
                  Un itinéraire gravé dans la poussière claire du matin.
                </p>
                <p className="mt-2 font-courier text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-start)]/70">
                  {f.label} · {f.titleLabel} / {f.contentLabel}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Aperçu des familles en dur dans la carte — on NE change pas les CSS variables globales. */
const PREVIEW_FONT_FAMILY: Record<FontPresetId, string> = {
  classique: "'Cormorant Garamond', serif",
  editorial: "'Fraunces', 'Playfair Display', serif",
  magazine: "'Playfair Display', 'Fraunces', serif",
  instrument: "'Instrument Serif', 'Fraunces', serif",
  "pop-display": "'Unbounded', 'Geist', sans-serif",
  "spectral-soft": "'Fraunces', 'Instrument Serif', serif",
  studio: "'DM Serif Display', 'Fraunces', serif",
  zine: "'Archivo Black', 'Archivo Narrow', sans-serif",
  jardin: "'EB Garamond', 'Cormorant Garamond', serif",
};

const PREVIEW_CONTENT_FAMILY: Record<FontPresetId, string> = {
  classique: "'Courier Prime', monospace",
  editorial: "'Bricolage Grotesque', sans-serif",
  magazine: "'Inter Tight', sans-serif",
  instrument: "'Onest', sans-serif",
  "pop-display": "'Geist', sans-serif",
  "spectral-soft": "'Spectral', serif",
  studio: "'DM Sans', sans-serif",
  zine: "'Archivo Narrow', sans-serif",
  jardin: "'Karla', sans-serif",
};
