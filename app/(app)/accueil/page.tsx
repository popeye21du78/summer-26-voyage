import { getProfileById } from "@/data/test-profiles";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AccueilHub from "@/components/accueil/AccueilHub";

export default async function AccueilPage() {
  const auth = await getServerAuth();
  let profileId = "";
  let profileName = "Voyageur";
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
  } else if (auth?.kind === "test") {
    const profile = getProfileById(auth.userId);
    profileId = auth.userId;
    profileName = profile?.name ?? "Voyageur";
  }

  return (
    <AccueilHub
      profileId={profileId}
      profileName={profileName}
    />
  );
}
