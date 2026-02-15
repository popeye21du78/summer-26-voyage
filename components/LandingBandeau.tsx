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
      className="fixed left-0 right-0 top-0 z-[110] flex items-center justify-between px-4 py-3"
      style={{ background: "rgba(255, 255, 255, 0.12)" }}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center transition-opacity hover:opacity-90"
        aria-label="Voyage Voyage - Accueil"
      >
        <Image
          src="/logo-2-W.png"
          alt="Voyage Voyage"
          width={80}
          height={40}
          className="h-8 w-auto sm:h-10"
          priority
          unoptimized
        />
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1 rounded p-2 text-[#333333] transition hover:bg-white/20"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-[#A55734]/20 bg-white/95 py-1 shadow-lg backdrop-blur-sm"
            role="menu"
          >
            <Link
              href="/login"
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-[#333333] hover:bg-[#A55734]/10"
              onClick={() => setMenuOpen(false)}
            >
              Se connecter
            </Link>
            <Link
              href="/login"
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-[#333333] hover:bg-[#A55734]/10"
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
