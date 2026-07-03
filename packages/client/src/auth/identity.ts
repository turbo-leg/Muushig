import type { Session } from '@supabase/supabase-js';

export interface AccountIdentity {
  userId: string;
  username: string;
  avatarUrl: string;
  accessToken: string;
}

/** Pulls a display identity (+ token for the game server) out of a Supabase session. */
export function identityFromSession(session: Session): AccountIdentity {
  const m = (session.user.user_metadata ?? {}) as Record<string, string>;
  return {
    userId: session.user.id,
    username: m.full_name || m.name || m.user_name || session.user.email?.split('@')[0] || 'Player',
    avatarUrl: m.avatar_url || m.picture || '',
    accessToken: session.access_token,
  };
}
