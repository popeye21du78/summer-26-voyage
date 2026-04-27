import { setCreatedVoyagesUserScope } from "@/lib/created-voyages";

/**
 * Cache session du profil courant (GET /api/me) pour éviter des appels répétés
 * quand plusieurs composants montent en parallèle (Viago, détail voyage, etc.).
 */
let profileIdCache: string | null | undefined = undefined;
let inflight: Promise<string | null> | null = null;

export function invalidateProfileIdCache(): void {
  profileIdCache = undefined;
  inflight = null;
  setCreatedVoyagesUserScope(null);
}

export function peekProfileIdCached(): string | null | undefined {
  return profileIdCache;
}

/** Une seule requête /api/me en vol ; résultat réutilisé tant que le cache n’est pas invalidé (logout). */
export function getProfileIdCached(): Promise<string | null> {
  if (profileIdCache !== undefined) {
    setCreatedVoyagesUserScope(profileIdCache);
    return Promise.resolve(profileIdCache);
  }
  if (!inflight) {
    inflight = fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { profileId?: string } | null) => {
        const id = typeof d?.profileId === "string" ? d.profileId : null;
        profileIdCache = id;
        setCreatedVoyagesUserScope(id);
        return id;
      })
      .catch(() => {
        profileIdCache = null;
        setCreatedVoyagesUserScope(null);
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
