import { cookies } from "next/headers";
import { getProfileById } from "@/data/test-profiles";
import MonEspaceShell from "@/components/mon-espace/MonEspaceShell";

export default async function MonEspacePage() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("van_auth")?.value ?? "";
  const profile = getProfileById(profileId);

  return (
    <MonEspaceShell
      profileId={profileId}
      profileName={profile?.name ?? "Voyageur"}
      situationLabel={profile?.situationLabel ?? ""}
    />
  );
}
