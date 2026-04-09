import Header from "../../components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--cream)]">
      <Header />
      <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
