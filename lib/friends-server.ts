import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { TEST_PROFILES } from "@/data/test-profiles";
import { getVoyageForProfile, type Voyage } from "@/data/mock-voyages";
import { getVoyagesAmis, type VoyageAmi } from "@/data/mock-friends";

function pickDemoProfileIdForIndex(i: number): string {
  return TEST_PROFILES[i % TEST_PROFILES.length]!.id;
}

export async function isAcceptedFriend(
  client: SupabaseClient<Database>,
  me: string,
  other: string
): Promise<boolean> {
  if (me === other) return true;
  const low = me < other ? me : other;
  const high = me < other ? other : me;
  const { data, error } = await client
    .from("friend_edges")
    .select("status")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();
  if (error || !data) return false;
  return data.status === "accepted";
}

/**
 * Voyage « amis » pour un compte **Supabase** : mêmes cartes qu’en démo (getVoyagesAmis), noms = `profiles`.
 */
export async function getVoyagesAmisForAuthUser(
  client: SupabaseClient<Database>,
  userId: string
): Promise<VoyageAmi[] | null> {
  const { data: rows, error } = await client
    .from("friend_edges")
    .select("user_low, user_high, status, requested_by")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`);

  if (error) {
    console.error("getVoyagesAmisForAuthUser:", error);
    return null;
  }
  const accepted = (rows ?? []).filter((r) => r.status === "accepted");
  const friendIds: string[] = [];
  for (const e of accepted) {
    if (e.user_low === userId) friendIds.push(e.user_high);
    else friendIds.push(e.user_low);
  }
  if (friendIds.length === 0) return [];
  const { data: profs, error: pe } = await client
    .from("profiles")
    .select("id, display_name")
    .in("id", friendIds);
  if (pe) {
    console.error("profiles fetch:", pe);
  }
  const nameBy = new Map((profs ?? []).map((p) => [p.id, p.display_name] as const));
  const out: VoyageAmi[] = [];
  for (let i = 0; i < friendIds.length; i++) {
    const fid = friendIds[i]!;
    const sim = pickDemoProfileIdForIndex(i);
    const state = getVoyageForProfile(sim);
    const profileName = nameBy.get(fid) ?? "Ami";
    const prevus =
      state.voyagesPrevus && state.voyagesPrevus.length > 0
        ? state.voyagesPrevus
        : state.voyagePrevu
          ? [state.voyagePrevu]
          : [];
    for (const voyage of prevus) {
      out.push({
        profileId: fid,
        profileName,
        voyage,
        type: "prevu",
        joursRestants: state.joursRestants,
      });
    }
    if (state.voyageEnCours) {
      out.push({
        profileId: fid,
        profileName,
        voyage: state.voyageEnCours,
        type: "en_cours",
        jourActuel: state.jourActuel,
      });
    }
    if (state.voyagesTermines?.length) {
      for (const v of state.voyagesTermines) {
        out.push({
          profileId: fid,
          profileName,
          voyage: v as Voyage,
          type: "termine",
        });
      }
    }
  }
  return out;
}

/**
 * Délègue à la simu de démo quand l’user est un id **test** (van_auth).
 */
export function getVoyagesAmisTestMode(profileId: string): VoyageAmi[] {
  return getVoyagesAmis(profileId);
}

export function sortPairIds(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}
