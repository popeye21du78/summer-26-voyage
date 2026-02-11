"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Step } from "../types";
import type { BookSection, BookSectionStyle } from "../types";

type Props = {
  step: Step;
};

export default function BookSectionEditor({ step }: Props) {
  const [texte, setTexte] = useState(step.contenu_voyage.anecdote ?? "");
  const [photos, setPhotos] = useState<string[]>(
    step.contenu_voyage.photos ?? []
  );
  const [style, setStyle] = useState<BookSectionStyle>({
    police_titre: "serif",
    police_sous_titre: "sans",
    gras: true,
    italique: false,
    layout: "single",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"ok" | "error" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/book/sections")
      .then((r) => r.json())
      .then((data) => {
        const sections = data.sections ?? [];
        const existing = sections.find(
          (s: BookSection) => s.step_id === step.id
        );
        if (existing) {
          setTexte(existing.texte ?? "");
          setPhotos(Array.isArray(existing.photos) ? existing.photos : []);
          if (existing.style) setStyle(existing.style);
        }
      })
      .catch(() => {});
  }, [step.id]);

  useEffect(() => {
    if (editableRef.current && editableRef.current.innerHTML !== texte) {
      editableRef.current.innerHTML = texte || "";
    }
  }, [texte]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !(e.target as Element)?.closest("[data-menu-trigger]")
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/book/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: step.id,
          texte,
          style,
          photos,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage("ok");
      } else {
        setMessage("error");
      }
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  const syncFromEditable = useCallback(() => {
    if (editableRef.current) {
      setTexte(editableRef.current.innerHTML);
    }
  }, []);

  const execFormat = useCallback(
    (command: string, value?: string) => {
      editableRef.current?.focus();
      document.execCommand(command, false, value ?? undefined);
      syncFromEditable();
      setMenuOpen(false);
    },
    [syncFromEditable]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("step_id", step.id);
      const res = await fetch("/api/book/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newPhotos = [...photos, data.url];
        setPhotos(newPhotos);
        try {
          await fetch("/api/book/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step_id: step.id,
              texte,
              style,
              photos: newPhotos,
            }),
          });
        } catch {
          setMessage("error");
        }
      }
    } catch {
      setMessage("error");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/book"
        className="mb-8 inline-block text-sm text-[#A55734] hover:underline"
      >
        ← Retour au Book
      </Link>

      <h1 className="mb-8 text-3xl font-light text-[#333333]">
        Créer / Modifier – {step.nom}
      </h1>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-[#333333]">
              Texte / anecdote
            </label>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                data-menu-trigger
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#333333]/60 transition-colors hover:bg-[#e8ddd0] hover:text-[#333333]"
                title="Formatage"
                aria-expanded={menuOpen}
              >
                <span className="text-lg leading-none">⋮</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-[#A55734]/40 bg-[#FAF4F0] py-2 shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-[#e8ddd0] px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#333333]/50">
                    Format (sélection)
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => execFormat("bold")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF2EB]/50"
                  >
                    <span className="font-bold">G</span>
                    <span>Gras</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => execFormat("italic")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF2EB]/50"
                  >
                    <span className="italic">I</span>
                    <span>Italique</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => execFormat("formatBlock", "h1")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF2EB]/50"
                  >
                    <span className="text-lg font-bold">H1</span>
                    <span>Titre 1</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => execFormat("formatBlock", "h2")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF2EB]/50"
                  >
                    <span className="font-bold">H2</span>
                    <span>Titre 2</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => execFormat("formatBlock", "p")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF2EB]/50"
                  >
                    <span>P</span>
                    <span>Paragraphe</span>
                  </button>
                  <div className="my-2 border-t border-[#e8ddd0]" />
                  <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#333333]/50">
                    Style section
                  </div>
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {(["serif", "sans"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setStyle({ ...style, police_titre: v });
                          setMenuOpen(false);
                        }}
                        className={`rounded px-2 py-1 text-xs ${style.police_titre === v ? "bg-[#A55734] text-white" : "bg-[#FFF2EB]/50 text-[#333333]"}`}
                      >
                        {v === "serif" ? "Titre Serif" : "Titre Sans"}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {(["single", "grid2", "grid3"] as const).map((layout) => (
                      <button
                        key={layout}
                        type="button"
                        onClick={() => {
                          setStyle({ ...style, layout });
                          setMenuOpen(false);
                        }}
                        className={`rounded px-2 py-1 text-xs ${style.layout === layout ? "bg-[#A55734] text-white" : "bg-[#FFF2EB]/50 text-[#333333]"}`}
                      >
                        {layout === "single" ? "1 col" : layout === "grid2" ? "2 col" : "3 col"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncFromEditable}
            onBlur={syncFromEditable}
            className="min-h-[180px] w-full rounded-lg border border-[#A55734]/40 bg-[#FAF4F0] p-3 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734] [&:empty]:before:pointer-events-none [&:empty]:before:float-left [&:empty]:before:h-0 [&:empty]:before:content-['Écris_ici…_Sélectionne_du_texte_et_clique_⋮_pour_gras/italique/titres.'] [&:empty]:before:text-[#333333]/40"
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-[#333333]">Photos</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div
                key={i}
                className="group relative aspect-square w-20 overflow-hidden rounded-lg"
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#A55734]/40 text-[#A55734] transition-colors hover:border-[#A55734]">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="text-2xl">{uploading ? "…" : "+"}</span>
            </label>
          </div>
          <p className="mt-2 text-xs text-[#333333]/70">
            Clique sur + pour ajouter une photo. Elle sera uploadée sur
            Supabase.
          </p>
        </div>

        {message === "ok" && (
          <p className="text-sm text-green-700">Enregistré !</p>
        )}
        {message === "error" && (
          <p className="text-sm text-red-600">
            Erreur. Vérifie que Supabase est configuré et que la table existe.
          </p>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary bg-[#A55734] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8b4728] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link
            href="/book"
            className="btn-secondary border border-[#A55734] px-6 py-3 text-sm font-medium text-[#A55734] transition-colors hover:bg-[#A55734]/10"
          >
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
