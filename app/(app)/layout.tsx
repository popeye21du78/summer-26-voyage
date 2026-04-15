import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[#111111]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
