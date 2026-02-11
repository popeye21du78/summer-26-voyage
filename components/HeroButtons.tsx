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
        className="btn-primary bg-[#A55734] px-6 py-3 text-sm font-normal text-white transition-all hover:bg-[#8b4728]"
      >
        Voir le trajet
      </button>
      <Link
        href="/book"
        className="btn-secondary rounded-full border-2 border-[#A55734] bg-transparent px-6 py-3 text-sm font-normal text-[#A55734] transition-all hover:bg-[#A55734]/10"
      >
        Voir le Book
      </Link>
    </div>
  );
}
