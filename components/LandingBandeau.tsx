"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";

export default function LandingBandeau() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[110] flex items-center justify-between px-4 py-1.5"
      style={{ background: "transparent" }}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center transition-opacity hover:opacity-90"
        aria-label="Voyage Voyage - Accueil"
      >
        <Image
          src="/A1.png"
          alt="Viago"
          width={36}
          height={36}
          className="h-8 w-auto sm:h-10"
          style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg) brightness(1.1)" }}
          priority
        />
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1 rounded p-2 text-white/60 transition hover:bg-white/10"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border border-white/10 bg-[#1c1c1c]/95 py-1 shadow-xl backdrop-blur-lg"
            role="menu"
          >
            <Link
              href="/login"
              role="menuitem"
              className="block px-4 py-2.5 font-courier text-sm text-white/70 hover:bg-[#E07856]/10 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Se connecter
            </Link>
            <Link
              href="/login"
              role="menuitem"
              className="block px-4 py-2.5 font-courier text-sm text-white/70 hover:bg-[#E07856]/10 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
