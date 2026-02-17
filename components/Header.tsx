"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, UserCog } from "lucide-react";

const NAV_LINKS = [
  { href: "/accueil", label: "Accueil" },
  { href: "/carte-villes", label: "Carte lieux" },
  { href: "/recap-lieux", label: "Récap lieux" },
  { href: "/planning", label: "Planning" },
  { href: "/book", label: "Book" },
  { href: "/data", label: "Data" },
  { href: "/admin-lieux", label: "Admin" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
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

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between bg-[#A55734] px-4 py-3 shadow-md">
      <Link
        href="/accueil"
        className="text-lg font-normal text-[#FFFBF7] transition-opacity hover:opacity-90"
      >
        Van-Life Journal
      </Link>
      <nav className="flex items-center gap-6" aria-label="Navigation principale">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive =
            href === "/accueil" ? pathname === "/accueil" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-normal transition-colors ${
                isActive
                  ? "text-[#FFFBF7] font-[400]"
                  : "text-[#FFFBF7]/80 hover:text-[#FFFBF7]"
              }`}
            >
              {label}
            </Link>
          );
        })}

        {/* Menu (Mes voyages + Déconnexion) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1 rounded p-1.5 text-[#FFFBF7]/90 transition hover:bg-[#FFFBF7]/15 hover:text-[#FFFBF7]"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-[#A55734]/20 bg-[#FFFBF7] py-1 shadow-lg"
              role="menu"
            >
              <Link
                href="/mes-voyages"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#333333] hover:bg-[#A55734]/10"
                onClick={() => setMenuOpen(false)}
              >
                Mes voyages
              </Link>
              <Link
                href="/profil"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#333333] hover:bg-[#A55734]/10"
                onClick={() => setMenuOpen(false)}
              >
                <UserCog className="h-4 w-4" />
                Modifier ma perso
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#333333] hover:bg-[#A55734]/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
