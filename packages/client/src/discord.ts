import { useEffect, useState } from 'react';
import { DiscordSDK, Common, Events } from '@discord/embedded-app-sdk';

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
  // Allow both of our responsive layouts (portrait phone felt + landscape).
  try {
    await sdk.commands.setOrientationLockState({
      lock_state: Common.OrientationLockStateTypeObject.UNLOCKED,
    });
  } catch {
    /* non-critical — older clients / unsupported platforms */
  }
  // Real Discord identity via OAuth (needs the server token-exchange + secret).
  // Falls back to a guest name if anything in the flow is unavailable.
  const user = await runOAuth();
  return {
    username: user ? (user.global_name ?? user.username) : guestName(),
    avatarUrl: '',
    discordId: user?.id ?? '',
    discordInstanceId: sdk.instanceId ?? 'discord',
  };
}

// ──────────────────────────── OAuth ────────────────────────────

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
}

/** The authenticated Discord user (null until/unless OAuth succeeds). */
let authedUser: DiscordUser | null = null;

/** HTTP base for backend calls (token exchange). Mirrors net/client.ts. */
function httpBase(): string {
  const override = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (override) return override.replace(/^ws/, 'http');
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return 'http://localhost:2567';
}

/**
 * authorize → server `/api/token` exchange → authenticate. Returns the Discord
 * user, or null on any failure (no secret configured, user denies, etc.), so the
 * caller cleanly falls back to guest mode.
 */
async function runOAuth(): Promise<DiscordUser | null> {
  if (!sdk || !clientId) return null;
  try {
    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'rpc.activities.write', 'rpc.voice.read'],
    });
    const res = await fetch(`${httpBase()}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return null;
    const { access_token } = (await res.json()) as { access_token?: string };
    if (!access_token) return null;
    const auth = await sdk.commands.authenticate({ access_token });
    authedUser = auth.user as DiscordUser;
    return authedUser;
  } catch {
    return null;
  }
}

// ──────────────────────────── Rich presence + invite ────────────────────────────

/** Broadcast a short status to the user's friends list. No-op outside Discord. */
export async function setRichPresence(details: string, state: string): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.commands.setActivity({ activity: { details, state } });
  } catch {
    /* needs rpc.activities.write — ignore if not granted */
  }
}

/** Open Discord's native invite dialog to fill empty seats. No-op outside Discord. */
export async function openInvite(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.commands.openInviteDialog();
  } catch {
    /* ignore */
  }
}

// ──────────────────────────── Speaking indicators ────────────────────────────

/**
 * Discord user ids currently speaking in the activity's voice channel, for the
 * green ring on player seats. Empty outside Discord or without rpc.voice.read.
 */
export function useSpeaking(): Set<string> {
  const [speaking, setSpeaking] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const channel_id = sdk?.channelId;
    if (!sdk || !channel_id) return;
    const onStart = (e: { user_id: string }) => setSpeaking((prev) => new Set(prev).add(e.user_id));
    const onStop = (e: { user_id: string }) =>
      setSpeaking((prev) => {
        const next = new Set(prev);
        next.delete(e.user_id);
        return next;
      });
    let subscribed = false;
    try {
      sdk.subscribe(Events.SPEAKING_START, onStart, { channel_id });
      sdk.subscribe(Events.SPEAKING_STOP, onStop, { channel_id });
      subscribed = true;
    } catch {
      /* scope not granted — leave the set empty */
    }
    return () => {
      if (!subscribed || !sdk) return;
      try {
        sdk.unsubscribe(Events.SPEAKING_START, onStart, { channel_id });
        sdk.unsubscribe(Events.SPEAKING_STOP, onStop, { channel_id });
      } catch {
        /* ignore */
      }
    };
  }, []);
  return speaking;
}

// ──────────────────────────── Layout / device hooks ────────────────────────────

export type LayoutMode = 'focused' | 'pip' | 'grid';

function layoutFromCode(code: number): LayoutMode {
  if (code === Common.LayoutModeTypeObject.PIP) return 'pip';
  if (code === Common.LayoutModeTypeObject.GRID) return 'grid';
  return 'focused';
}

/**
 * The current Discord layout mode. Outside Discord (local dev) it stays
 * 'focused'. Drives the PIP graceful-degradation view.
 */
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>('focused');
  useEffect(() => {
    if (!sdk) return;
    const onUpdate = (e: { layout_mode: number }) => setMode(layoutFromCode(e.layout_mode));
    sdk.subscribe(Events.ACTIVITY_LAYOUT_MODE_UPDATE, onUpdate);
    return () => {
      sdk.unsubscribe(Events.ACTIVITY_LAYOUT_MODE_UPDATE, onUpdate);
    };
  }, []);
  return mode;
}

/**
 * Sets `data-perf="low"` on <html> when the device reports a hot thermal state
 * (SERIOUS/CRITICAL) so CSS can drop animations and ease battery/heat. No-op
 * outside Discord.
 */
export function useThermalThrottle(): void {
  useEffect(() => {
    if (!sdk) return;
    const onThermal = (e: { thermal_state: number }) => {
      const hot =
        e.thermal_state === Common.ThermalStateTypeObject.SERIOUS ||
        e.thermal_state === Common.ThermalStateTypeObject.CRITICAL;
      if (hot) document.documentElement.dataset.perf = 'low';
      else delete document.documentElement.dataset.perf;
    };
    sdk.subscribe(Events.THERMAL_STATE_UPDATE, onThermal);
    return () => {
      sdk.unsubscribe(Events.THERMAL_STATE_UPDATE, onThermal);
    };
  }, []);
}
