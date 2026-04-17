import BottomNav from "@/components/layout/BottomNav";
import AppScrollShell from "@/components/layout/AppScrollShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[#111111]">
      <AppScrollShell>
        <div className="flex min-h-full min-w-0 flex-col pb-16">{children}</div>
      </AppScrollShell>
      <BottomNav />
    </div>
  );
}
