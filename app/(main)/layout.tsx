import Header from "../../components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Header />
      <div className="min-h-screen">
        {children}
      </div>
    </div>
  );
}
