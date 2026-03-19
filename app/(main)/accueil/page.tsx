import { cookies } from "next/headers";
import WelcomeLogoOverlay from "../../../components/WelcomeLogoOverlay";
import AccueilContent from "../../../components/AccueilContent";
import { getProfileById } from "../../../data/test-profiles";

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const showWelcome = params.welcome === "1";
  const cookieStore = await cookies();
  const profileId = cookieStore.get("van_auth")?.value ?? "";
  const profile = getProfileById(profileId);

  return (
    <>
      <WelcomeLogoOverlay show={showWelcome} />
      <AccueilContent profileName={profile?.name} />
    </>
  );
}
