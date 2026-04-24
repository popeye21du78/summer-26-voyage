import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { VALID_PROFILE_IDS } from "@/data/test-profiles";
import type { Database } from "@/types/supabase";

export type ServerAuth =
  | { kind: "supabase"; userId: string; email: string | null }
  | { kind: "test"; userId: string };

/**
 * Profil de session : **Supabase Auth** (e-mail) si cookie de session valide, sinon profil de **démo** (`van_auth`).
 * À utiliser dans les **Route Handlers** (API) et **Server Components** (cookies() dispo).
 */
export async function getServerAuth(): Promise<ServerAuth | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* lecture seule côté serveur */
          }
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return { kind: "supabase", userId: user.id, email: user.email ?? null };
    }
  }
  const cookieStore = await cookies();
  const van = cookieStore.get("van_auth")?.value ?? "";
  if (van && VALID_PROFILE_IDS.includes(van)) {
    return { kind: "test", userId: van };
  }
  return null;
}

/** Clé de persistance Viago (texte) : id auth ou id profil démo. */
export function getViagoUserId(auth: ServerAuth | null): string | null {
  return auth?.userId ?? null;
}
