/**
 * Réseau social simulé : tous les users de test sont amis entre eux.
 */

import { getVoyageForProfile } from "./mock-voyages";
import type { Voyage } from "./mock-voyages";
import { TEST_PROFILES } from "./test-profiles";

/** IDs des amis pour un profil (tous sauf soi-même) */
export function getFriendIds(profileId: string): string[] {
  return TEST_PROFILES.filter((p) => p.id !== profileId).map((p) => p.id);
}

/** Voyages des amis (prévus, en cours, terminés) pour affichage social */
export interface VoyageAmi {
  profileId: string;
  profileName: string;
  voyage: Voyage;
  type: "prevu" | "en_cours" | "termine";
  joursRestants?: number;
  jourActuel?: number;
}

export function getVoyagesAmis(profileId: string): VoyageAmi[] {
  const friendIds = getFriendIds(profileId);
  const result: VoyageAmi[] = [];

  for (const fid of friendIds) {
    const profile = TEST_PROFILES.find((p) => p.id === fid);
    if (!profile) continue;

    const state = getVoyageForProfile(fid);
    if (state.voyagePrevu) {
      result.push({
        profileId: fid,
        profileName: profile.name,
        voyage: state.voyagePrevu,
        type: "prevu",
        joursRestants: state.joursRestants,
      });
    }
    if (state.voyageEnCours) {
      result.push({
        profileId: fid,
        profileName: profile.name,
        voyage: state.voyageEnCours,
        type: "en_cours",
        jourActuel: state.jourActuel,
      });
    }
    if (state.voyagesTermines?.length) {
      for (const v of state.voyagesTermines) {
        result.push({
          profileId: fid,
          profileName: profile.name,
          voyage: v,
          type: "termine",
        });
      }
    }
  }

  return result;
}
