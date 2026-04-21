import Link from "next/link";

export default function PlanifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff2e8] via-[#ffe8dc] to-[#f0d4c4]">
      <div className="mx-auto flex max-w-4xl justify-end px-4 pt-4">
        <Link
          href="/planifier"
          className="font-courier text-xs font-bold text-[var(--color-accent-end)] underline hover:text-[var(--color-accent-deep)]"
        >
          Hub planifier
        </Link>
      </div>
      {children}
    </div>
  );
}
