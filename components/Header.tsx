"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/book", label: "Book" },
  { href: "/planning", label: "Planning" },
  { href: "/data", label: "Data" },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-[#A55734] px-4 py-3">
      <Link
        href="/"
        className="text-lg font-normal text-[#FFFBF7] transition-opacity hover:opacity-90"
      >
        Van-Life Journal
      </Link>
      <nav className="flex gap-6" aria-label="Navigation principale">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
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
      </nav>
    </header>
  );
}
