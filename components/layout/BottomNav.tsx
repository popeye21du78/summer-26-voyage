"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Compass, PlusCircle, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/accueil", label: "Accueil", icon: null, isLogo: true },
  { href: "/inspirer", label: "S'inspirer", icon: Compass, isLogo: false },
  { href: "/preparer", label: "Préparer", icon: PlusCircle, isLogo: false },
  { href: "/mon-espace", label: "Mon espace", icon: User, isLogo: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/6 bg-[#0e0e0e]/95 backdrop-blur-xl transition-transform duration-200 ease-out"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isLogo }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              prefetch
              onPointerEnter={() => prefetch(href)}
              className="group flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-[0.97]"
            >
              {isLogo ? (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                    active
                      ? "bg-gradient-to-br from-[#E07856] to-[#c94a4a] shadow-[0_2px_12px_rgba(224,120,86,0.4)]"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                >
                  <Image
                    src="/A1.png"
                    alt="Viago"
                    width={18}
                    height={18}
                    className={`transition-all ${active ? "brightness-[10]" : "brightness-[0.6] group-hover:brightness-[0.8]"}`}
                  />
                </div>
              ) : Icon ? (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                    active
                      ? "bg-gradient-to-br from-[#E07856]/20 to-[#c94a4a]/10 shadow-[0_0_10px_rgba(224,120,86,0.15)]"
                      : "group-hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`h-[20px] w-[20px] transition-colors duration-150 ${
                      active
                        ? "text-[#E07856]"
                        : "text-white/25 group-hover:text-white/45"
                    }`}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </div>
              ) : null}
              <span
                className={`font-courier text-[9px] leading-none tracking-wide transition-colors duration-150 ${
                  active
                    ? "font-bold text-[#E07856]"
                    : "text-white/25 group-hover:text-white/40"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
