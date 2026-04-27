import { Suspense } from "react";
import { getProfileById } from "@/data/test-profiles";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";
import MonEspaceShell from "@/components/mon-espace/MonEspaceShell";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MonEspacePage({ searchParams }: Props) {
  const auth = await getServerAuth();
  let profileId = "";
  let profileName = "Voyageur";
  let situationLabel = "";
  if (auth?.kind === "supabase") {
    profileId = auth.userId;
    profileName = auth.email?.split("@")[0] ?? "Voyageur";
    if (supabaseAdmin) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", auth.userId)
        .maybeSingle();
      if (p?.display_name?.trim()) profileName = p.display_name.trim();
    }
    situationLabel = "Compte e-mail";
  } else if (auth?.kind === "test") {
    const profile = getProfileById(auth.userId);
    profileId = auth.userId;
    profileName = profile?.name ?? "Voyageur";
    situationLabel = profile?.situationLabel ?? "";
  }
  const sp = searchParams ? await searchParams : {};
  const initialSection =
    typeof sp?.section === "string" ? sp.section : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col [min-height:calc(100dvh-5rem)]">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-main)] p-8">
            <p className="voyage-loading-text text-sm uppercase tracking-widest">voyage voyage…</p>
          </div>
        }
      >
        <MonEspaceShell
          profileId={profileId}
          profileName={profileName}
          situationLabel={situationLabel}
          initialSection={initialSection}
          authMode={auth?.kind === "supabase" ? "supabase" : "test"}
        />
      </Suspense>
    </div>
  );
}
