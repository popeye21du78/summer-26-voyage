import { cookies } from "next/headers";
import { getProfileById } from "@/data/test-profiles";
import AccueilHub from "@/components/accueil/AccueilHub";

export default async function AccueilPage() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("van_auth")?.value ?? "";
  const profile = getProfileById(profileId);

  return (
    <AccueilHub
      profileId={profileId}
      profileName={profile?.name ?? "Voyageur"}
    />
  );
}
