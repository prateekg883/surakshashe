import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/**
 * Server-only Supabase admin client using the service-role key.
 * NEVER expose this key to the browser.
 * Used for: creating users, validating JWTs server-side, admin operations.
 */
export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
    );
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validate a Supabase JWT access token server-side.
 * Returns the Supabase auth user if valid, or null.
 */
export async function getSupabaseUser(accessToken: string) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseAnonClient() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
    );
  }
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
