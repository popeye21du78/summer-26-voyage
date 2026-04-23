import { cookies } from "next/headers";
import { getProfileById } from "@/data/test-profiles";
import MonEspaceShell from "@/components/mon-espace/MonEspaceShell";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MonEspacePage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("van_auth")?.value ?? "";
  const profile = getProfileById(profileId);
  const sp = searchParams ? await searchParams : {};
  const initialSection =
    typeof sp?.section === "string" ? sp.section : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col [min-height:calc(100dvh-5rem)]">
      <MonEspaceShell
        profileId={profileId}
        profileName={profile?.name ?? "Voyageur"}
        situationLabel={profile?.situationLabel ?? ""}
        initialSection={initialSection}
      />
    </div>
  );
}
