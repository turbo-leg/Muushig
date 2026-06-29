import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase browser client, or `null` when env vars are absent. When null the app
 * runs in guest mode (no accounts), so the game still works locally without a
 * configured Supabase project.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

/** Whether accounts/login are available in this build. */
export const isAuthEnabled = supabase !== null;
