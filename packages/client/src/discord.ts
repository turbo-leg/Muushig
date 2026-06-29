import { DiscordSDK } from '@discord/embedded-app-sdk';

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

/** True when running inside Discord's Activity iframe (not local dev / native). */
export const isEmbedded =
  !!clientId &&
  (window.location.search.includes('frame_id') || document.referrer.includes('discord.com'));

const sdk = isEmbedded && clientId ? new DiscordSDK(clientId) : null;

export interface Identity {
  username: string;
  avatarUrl: string;
  discordId: string;
  /** Groups players in the same Discord activity into the same room. */
  discordInstanceId: string;
  /** Supabase access token, when signed in — lets the server verify the seat. */
  accessToken?: string;
  /** Supabase user id, when signed in. */
  userId?: string;
}

const ADJECTIVES = ['Roaming', 'Eternal', 'Golden', 'Azure', 'Silent', 'Swift', 'Boundless'];
const NOUNS = ['Falcon', 'Steppe', 'Horse', 'Eagle', 'Wolf', 'Khan', 'Sky'];

function guestName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

/**
 * Resolves the player's identity. In Discord, waits for the SDK and uses the
 * activity instance id for matchmaking.
 *
 * NOTE: full OAuth (real username/avatar) needs a server `/api/token` exchange
 * endpoint — tracked as a #3 follow-up. For now a guest display name is used.
 */
export async function resolveIdentity(): Promise<Identity> {
  if (!sdk) {
    return { username: guestName(), avatarUrl: '', discordId: '', discordInstanceId: 'local-dev' };
  }
  await sdk.ready();
  return {
    username: guestName(),
    avatarUrl: '',
    discordId: '',
    discordInstanceId: sdk.instanceId ?? 'discord',
  };
}
