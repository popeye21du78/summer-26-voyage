import BottomNav from "@/components/layout/BottomNav";
import AppScrollShell from "@/components/layout/AppScrollShell";
import AppLogoSignature from "@/components/layout/AppLogoSignature";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-transparent">
      <AppScrollShell>
        <div className="flex min-h-full min-w-0 flex-col pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </AppScrollShell>
      <AppLogoSignature />
      <BottomNav />
    </div>
  );
}
