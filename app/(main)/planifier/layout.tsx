import Link from "next/link";

export default function PlanifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#F5E6D3]">
      <div className="mx-auto flex max-w-4xl justify-end px-4 pt-4">
        <Link
          href="/planifier"
          className="font-courier text-xs font-bold text-[#A55734] underline hover:text-[#8b4728]"
        >
          Hub planifier
        </Link>
      </div>
      {children}
    </div>
  );
}
