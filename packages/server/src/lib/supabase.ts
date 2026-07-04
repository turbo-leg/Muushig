import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase client using the service-role key. It bypasses RLS, so it
 * is the only thing allowed to write stats / match history. `null` when env vars
 * are absent (the server then runs without persistence — guest games).
 */
export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export interface AuthedUser {
  id: string;
  username: string;
  avatarUrl: string;
}

/**
 * Verifies a Supabase access token (sent by the client when joining a room) and
 * returns the authenticated user, or `null` if the token is missing/invalid or
 * persistence is disabled.
 */
/**
 * Whether a verified user holds a premium account (gates creating custom
 * lobbies). False for guests and whenever persistence is disabled.
 */
export async function isPremium(userId: string): Promise<boolean> {
  if (!supabaseAdmin || !userId) return false;
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('premium')
    .eq('id', userId)
    .maybeSingle();
  return !!(data as { premium?: boolean } | null)?.premium;
}

export async function verifyUser(accessToken: string | undefined): Promise<AuthedUser | null> {
  if (!supabaseAdmin || !accessToken) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    username:
      (meta.full_name as string) ||
      (meta.name as string) ||
      (meta.user_name as string) ||
      data.user.email?.split('@')[0] ||
      'Player',
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || '',
  };
}
