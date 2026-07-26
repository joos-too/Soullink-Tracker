import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.ts";

let client: SupabaseClient<Database> | null = null;

const getRequiredEnvironmentValue = (name: string): string => {
  const value = import.meta.env[name] as string | undefined;
  if (!value?.trim()) {
    throw new Error(
      `Missing ${name}. Set it in .env as described in supabase/README.md.`,
    );
  }
  return value;
};

/**
 * Lazily creates the browser client so Firebase-only builds do not require
 * Supabase configuration while the migration switch remains on Firebase.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (client) return client;

  const url = getRequiredEnvironmentValue("VITE_SUPABASE_URL");
  const key = getRequiredEnvironmentValue("VITE_SUPABASE_ANON_KEY");
  client = createClient<Database>(url, key, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
};
