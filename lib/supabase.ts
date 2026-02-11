import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase URL ou ANON_KEY manquant – mode mock");
}

export const supabase = url && anonKey
  ? createClient<Database>(url, anonKey)
  : null;
