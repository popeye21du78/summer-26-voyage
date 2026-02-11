import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

/**
 * Client Supabase avec clé service_role – utilisé UNIQUEMENT côté serveur (API routes).
 * Contourne les politiques RLS. Ne jamais exposer cette clé au client.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  url && serviceRoleKey
    ? createClient<Database>(url, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : null;
