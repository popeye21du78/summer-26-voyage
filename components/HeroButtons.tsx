"use client";

import Link from "next/link";

export default function HeroButtons() {
  const scrollToMap = () => {
    requestAnimationFrame(() => {
      const el = document.getElementById("carte-bas");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    });
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button
        type="button"
        onClick={scrollToMap}
        className="btn-primary bg-[var(--color-accent-end)] px-6 py-3 text-sm font-normal text-white transition-all hover:bg-[var(--color-accent-deep)]"
      >
        Voir le trajet
      </button>
      <Link
        href="/book"
        className="btn-secondary rounded-full border-2 border-[var(--color-accent-end)] bg-transparent px-6 py-3 text-sm font-normal text-[var(--color-accent-end)] transition-all hover:bg-[var(--color-accent-end)]/10"
      >
        Voir le Book
      </Link>
      <Link
        href="/login"
        className="btn-secondary rounded-full border-2 border-[var(--color-accent-end)]/60 bg-transparent px-6 py-3 text-sm font-normal text-[#333333] transition-all hover:bg-[var(--color-accent-end)]/10"
      >
        Se connecter
      </Link>
    </div>
  );
}
