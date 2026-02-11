import Header from "../../components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF4F0]">
      <Header />
      <div className="page-signature-pattern min-h-[calc(100vh-4rem)] pt-16">{children}</div>
    </div>
  );
}
