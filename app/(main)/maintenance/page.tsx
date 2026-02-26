import Link from "next/link";
import { Map, BarChart3, Cpu, Settings, Route } from "lucide-react";

const MAINTENANCE_LINKS = [
  { href: "/carte-villes", label: "Carte lieux", icon: Map },
  { href: "/recap-lieux", label: "Récap lieux", icon: BarChart3 },
  { href: "/batch-status", label: "Batch", icon: Cpu },
  { href: "/admin-lieux", label: "Admin", icon: Settings },
  { href: "/itineraire", label: "Itinéraire", icon: Route },
] as const;

export default function MaintenancePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">Maintenance</h1>
      <p className="mb-4 text-[#333333]/80">
        Outils provisoires pendant la construction du site.
      </p>
      <p className="mb-8 text-sm text-[#333333]/60">
        Connecte-toi pour accéder aux outils ci-dessous.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAINTENANCE_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-lg border border-[#A55734]/20 bg-white p-5 transition hover:border-[#A55734]/40 hover:bg-[#FFF2EB]/30"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#A55734]/10">
              <Icon className="h-6 w-6 text-[#A55734]" aria-hidden />
            </div>
            <span className="font-medium text-[#333333]">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
