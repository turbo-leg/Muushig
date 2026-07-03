import { Client } from 'colyseus.js';

/**
 * Colyseus endpoint. Priority:
 *  1. VITE_SERVER_URL (explicit override — e.g. a Discord activity URL mapping)
 *  2. same-origin WSS in production (the Fly app serves both client + server)
 *  3. ws://localhost:2567 for local dev
 */
function serverUrl(): string {
  const override = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (override) return override;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}`;
  }
  return 'ws://localhost:2567';
}

export function createClient(): Client {
  return new Client(serverUrl());
}
