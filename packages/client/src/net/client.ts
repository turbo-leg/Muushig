import { Client } from 'colyseus.js';

// In dev, connect straight to the local game server (CORS is open). Override
// with VITE_SERVER_URL when deploying behind the Discord activity proxy.
const url = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567';

export function createClient(): Client {
  return new Client(url);
}
