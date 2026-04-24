import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

/**
 * Règle la session Supabase sur la réponse (rafraîchissement des cookies de session).
 */
export async function updateSupabaseSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: { id: string } | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { response: NextResponse.next({ request }), user: null };
  }
  let user: { id: string } | null = null;
  const response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });
  const {
    data: { user: u },
  } = await supabase.auth.getUser();
  if (u) user = { id: u.id };
  return { response, user };
}
