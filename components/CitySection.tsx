"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SectionType } from "../lib/city-prompts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mots complets avant de commencer l’affichage : un peu plus pour que le buffer prenne de l’avance (limite clignotements). */
const MIN_WORDS_BEFORE_DISPLAY = 6;

/** Retourne uniquement les mots complets ; on n'affiche qu'à partir de MIN_WORDS_BEFORE_DISPLAY mots. */
function getCompleteWordsOnly(str: string): string {
  const t = str.trimEnd();
  if (!t) return "";
  const lastSpace = t.lastIndexOf(" ");
  if (lastSpace === -1) return "";
  const complete = t.slice(0, lastSpace + 1);
  const wordCount = complete.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS_BEFORE_DISPLAY) return "";
  return complete;
}

function markdownToHtml(md: string): string {
  if (!md.trim()) return "<p class=\"my-2 text-[#333333]/90\"></p>";
  // Échapper # hors titres (hashtags, numéro #1) pour éviter qu’ils soient interprétés
  const escapedMd = md
    .split("\n")
    .map((line) => {
      if (!/^#+\s/.test(line)) return line.replace(/#/g, "&#35;");
      const afterHash = line.replace(/^#+\s+/, "").trim();
      if (/^\d+\.?\s*$/.test(afterHash)) return line.replace(/#/g, "&#35;");
      return line;
    })
    .join("\n");
  let s = esc(escapedMd);
  s = s
    .replace(
      /^#### (.+)$/gm,
      "<h4 class=\"text-base font-medium text-[#A55734] mt-3 mb-1\">$1</h4>"
    )
    .replace(/^### (.+)$/gm, "<h3 class=\"text-lg font-medium text-[#A55734] mt-4 mb-1\">$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-xl font-medium text-[#A55734] mt-4 mb-2\">$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class=\"text-2xl font-medium text-[#A55734] mt-4 mb-2\">$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold text-[#333333]\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, "<ul class=\"my-2 space-y-1\">$&</ul>")
    .replace(/\n\n+/g, "</p><p class=\"my-2 text-[#333333]/90\">")
    .replace(/\n/g, "<br/>");
  return "<p class=\"my-2 text-[#333333]/90\">" + s + "</p>";
}

/** Compte les caractères de texte (hors balises). */
function countTextChars(html: string): number {
  let n = 0;
  html.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag, text) => {
    if (text) n += text.length;
    return _m;
  });
  return n;
}

/**
 * Garde uniquement les n premiers caractères (spans data-i) du HTML.
 * On n’affiche que ce qui est « révélé » → pas de contenu en transparent, pas de remplacement massif = pas de clignotement.
 * La hauteur ne grandit qu’au rythme de la rédaction finale.
 */
function truncateHtmlToCharCount(html: string, n: number): string {
  if (n <= 0) return "";
  const spanRegex =
    /<span class="typewriter-char-stream" data-i="(\d+)">[^<]*<\/span>/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = spanRegex.exec(html)) !== null) {
    const i = parseInt(match[1], 10);
    if (i >= n) break;
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd === 0) return "";
  let out = html.slice(0, lastEnd);
  const openTags: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*(?:\/>|>)/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(out)) !== null) {
    if (m[0].startsWith("</")) openTags.pop();
    else if (!m[0].endsWith("/>")) openTags.push(m[1]);
  }
  out += openTags.reverse().map((t) => `</${t}>`).join("");
  return out;
}

/**
 * Enveloppe chaque caractère dans un span data-i pour contrôle par revealedLength.
 * Pas d'animation-delay : on révèle au rythme du timer (vitesse lecture, irrégulière).
 */
function htmlWithCharSpans(html: string): string {
  const escapeChar = (c: string) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : c;
  let i = 0;
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, text) => {
    if (tag) return tag;
    if (text) {
      return text
        .split("")
        .map((c) => `<span class="typewriter-char-stream" data-i="${i++}">${escapeChar(c)}</span>`)
        .join("");
    }
    return "";
  });
}

/** Extrait le texte lisible depuis du HTML (pour l’effet machine à écrire). */
/**
 * Enveloppe chaque caractère du texte (hors balises) dans un span avec animation-delay,
 * pour garder le format (police, gras, sauts de ligne) dès le départ.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function htmlWithTypewriterDelays(
  html: string,
  minMs: number,
  maxMs: number
): string {
  const escapeChar = (c: string) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : c;
  let totalDelay = 0;
  let charIndex = 0;
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, text) => {
    if (tag) return tag;
    if (text) {
      return text
        .split("")
        .map((c) => {
          const step = minMs + seededRandom(charIndex) * (maxMs - minMs);
          charIndex++;
          totalDelay += step;
          return `<span class="typewriter-char" style="animation-delay: ${Math.round(totalDelay)}ms">${escapeChar(c)}</span>`;
        })
        .join("");
    }
    return "";
  });
}

const TYPEWRITER_DELAY_MIN_MS = 14;
const TYPEWRITER_DELAY_MAX_MS = 52;
/** Stream : un tout petit peu plus vite lors de la première génération */
const STREAM_DELAY_MIN_MS = 2;
const STREAM_DELAY_MAX_MS = 10;
const STREAM_CHARS_PER_TICK = 1;

const SECTION_LABELS: Record<SectionType, string> = {
  en_quelques_mots: "en quelques mots", // affiché avec le nom de la ville devant
  point_historique: "Le point historique",
  bien_manger_boire: "Bien manger et bien boire",
  arriver_van: "Arriver en van",
  que_faire: "Que faire",
  anecdote: "Anecdote",
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
  const [streamedContent, setStreamedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!!initialContent);
  const [error, setError] = useState(false);
  const [contentFromStream, setContentFromStream] = useState(false);
  const [revealedLength, setRevealedLength] = useState(0);
  /** Une fois la section fermée puis rouverte, on affiche le contenu en cache en une fois. */
  const [showInstantReopen, setShowInstantReopen] = useState(false);
  const targetLengthRef = useRef(0);

  const fetchContent = useCallback(() => {
    setLoading(true);
    setError(false);
    setStreamedContent("");
    setContentFromStream(false);
    setRevealedLength(0);
    setShowInstantReopen(false);

    fetch("/api/section-ville", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        ville,
        sectionType,
        stream: true,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erreur de génération");
        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { content?: string };
          setContent(data.content ?? null);
          setContentFromStream(false);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setError(true);
          return;
        }
        const decoder = new TextDecoder();
        let accumulated = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setStreamedContent(accumulated);
          }
          setContent(accumulated.trim() || null);
          setContentFromStream(true);
        } finally {
          reader.releaseLock();
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [stepId, ville, sectionType]);

  const handleToggle = () => {
    if (!open) {
      setOpen(true);
      if (!content && !loading) fetchContent();
    } else {
      if (content) setShowInstantReopen(true);
      setOpen(false);
    }
  };

  const label =
    sectionType === "en_quelques_mots"
      ? `${ville} ${SECTION_LABELS[sectionType]}`
      : SECTION_LABELS[sectionType];

  // Texte affiché en mode stream : mots complets uniquement, au moins 2 mots pour démarrer
  const displayText =
    content ?? (streamedContent ? getCompleteWordsOnly(streamedContent) : "");
  const showStreamingTypewriter =
    !showInstantReopen &&
    (loading || contentFromStream) &&
    displayText.length > 0 &&
    (displayText.includes(" ") || content !== null);

  const streamHtml = showStreamingTypewriter
    ? markdownToHtml(displayText)
    : "";
  const streamHtmlWithSpans = streamHtml ? htmlWithCharSpans(streamHtml) : "";
  const streamTargetLength = streamHtml ? countTextChars(streamHtml) : 0;
  targetLengthRef.current = streamTargetLength;

  // Timer : révélation lettre par lettre, vitesse lecture irrégulière
  useEffect(() => {
    if (!showStreamingTypewriter || revealedLength >= streamTargetLength)
      return;
    const delay =
      STREAM_DELAY_MIN_MS +
      Math.random() * (STREAM_DELAY_MAX_MS - STREAM_DELAY_MIN_MS);
    const t = setTimeout(() => {
      setRevealedLength((r) =>
        Math.min(r + STREAM_CHARS_PER_TICK, targetLengthRef.current)
      );
    }, delay);
    return () => clearTimeout(t);
  }, [
    showStreamingTypewriter,
    streamTargetLength,
    revealedLength,
  ]);

  // Plafonner revealedLength si la cible diminue (ex. nouveau fetch)
  useEffect(() => {
    if (revealedLength > streamTargetLength)
      setRevealedLength((r) => Math.min(r, streamTargetLength));
  }, [streamTargetLength]);

  // Mise à jour synchrone : masquer le bloc pendant l’application (évite tout clignotement)
  const displayedHtml =
    showStreamingTypewriter && streamHtmlWithSpans
      ? truncateHtmlToCharCount(streamHtmlWithSpans, revealedLength) +
        (revealedLength < streamTargetLength
          ? '<span class="typewriter-cursor" aria-hidden>|</span>'
          : "")
      : "";

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
        <div
          className={`pb-4 ${open && (loading || showStreamingTypewriter) ? "min-h-[200px]" : ""}`}
        >
          {loading && !streamedContent && (
            <div className="flex min-h-[120px] flex-col items-center justify-center py-8">
              <span className="voyage-loading-text text-sm sm:text-base">
                voyage voyage
              </span>
            </div>
          )}
          {showStreamingTypewriter && displayedHtml && (
            <div className="prose prose-sm max-w-none typewriter-container typewriter-revealed-only">
              <div dangerouslySetInnerHTML={{ __html: displayedHtml }} />
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
          {content && !loading && showInstantReopen && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
            />
          )}
          {content && !loading && !contentFromStream && !showInstantReopen &&
            (() => {
              const html = markdownToHtml(content);
              const htmlWithDelays = htmlWithTypewriterDelays(
                html,
                TYPEWRITER_DELAY_MIN_MS,
                TYPEWRITER_DELAY_MAX_MS
              );
              const withCursor = htmlWithDelays.replace(
                /(<\/p>)\s*$/,
                (_: string, closing: string) =>
                  `<span class="typewriter-cursor" aria-hidden>|</span>${closing}`
              );
              return (
                <div
                  className="prose prose-sm max-w-none typewriter-container"
                  dangerouslySetInnerHTML={{ __html: withCursor }}
                />
              );
            })()}
        </div>
      )}
    </div>
  );
}
