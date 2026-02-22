import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const consumerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "gumi-auth-consumer",
  },
});

export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "gumi-auth-admin",
    // Prevent admin client from capturing consumer OAuth callback sessions.
    detectSessionInUrl: false,
  },
});

// Backward-compatible alias for existing consumer code paths.
export const supabase = consumerSupabase;
