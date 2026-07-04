import path from 'path';
import fs from 'fs';
import config from '@colyseus/tools';
import { monitor } from '@colyseus/monitor';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import cors from 'cors';
import express from 'express';
import { matchMaker } from 'colyseus';
import { MuushigRoom } from './src/rooms/MuushigRoom';
import { log } from './src/lib/log';

const redisUrl = process.env.REDIS_URL;

export default config({
  // Redis presence/driver enable horizontal scale when REDIS_URL is set.
  options: redisUrl
    ? { presence: new RedisPresence(redisUrl), driver: new RedisDriver(redisUrl) }
    : {},

  initializeGameServer: (gameServer) => {
    gameServer.define('muushig', MuushigRoom).filterBy(['discordInstanceId', 'maxPlayers']);
  },

  initializeExpress: (app) => {
    app.use(cors());
    app.use(express.json());

    // Allow Discord to embed this server's responses in an iframe.
    app.use((_req, res, next) => {
      res.setHeader('Content-Security-Policy', 'frame-ancestors *');
      next();
    });

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    });

    // Discord OAuth2 token exchange for the Embedded App SDK. The client sends
    // the `code` from sdk.commands.authorize; we swap it (with the secret) for an
    // access_token the client passes to sdk.commands.authenticate. Returns 400
    // unless DISCORD_CLIENT_ID/SECRET are set — the app then runs in guest mode.
    app.post('/api/token', async (req, res) => {
      const code = (req.body as { code?: string } | undefined)?.code;
      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      if (!code || !clientId || !clientSecret) {
        return res.status(400).json({ error: 'missing code or server Discord credentials' });
      }
      try {
        const r = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
          }),
        });
        const data = (await r.json()) as { access_token?: string };
        if (!data.access_token) return res.status(401).json({ error: 'token exchange failed' });
        return res.json({ access_token: data.access_token });
      } catch {
        return res.status(500).json({ error: 'token exchange error' });
      }
    });

    // Client error reports land in the structured log (Fly log drain is the
    // store — no Sentry). Per-IP sliding-window rate limit, hard field caps.
    const errorReportHits = new Map<string, number[]>();
    app.post('/api/client-error', express.json({ limit: '8kb' }), (req, res) => {
      const ip = req.ip ?? 'unknown';
      const now = Date.now();
      const hits = (errorReportHits.get(ip) ?? []).filter((t) => now - t < 60_000);
      hits.push(now);
      errorReportHits.set(ip, hits);
      if (hits.length > 10) return res.status(429).json({ error: 'rate limited' });

      const body = (req.body ?? {}) as Record<string, unknown>;
      const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);
      log('error', 'client_error', {
        message: clip(body.message, 500),
        stack: clip(body.stack, 2000),
        context: clip(body.context, 200),
        url: clip(body.url, 200),
        userAgent: clip(req.headers['user-agent'], 200),
      });
      return res.json({ ok: true });
    });

    // Resolve a private-table join code to a joinable roomId. Codes only exist
    // on privateTable rooms; the driver query sees private rooms (they are
    // merely hidden from matchmaking), and works across processes via Redis.
    app.get('/api/table/:code', async (req, res) => {
      const code = String(req.params.code ?? '')
        .toUpperCase()
        .slice(0, 8);
      if (!/^[A-Z2-9]{4}$/.test(code)) return res.status(404).json({ error: 'not found' });
      try {
        const rooms = await matchMaker.query({ name: 'muushig' });
        const room = rooms.find(
          (r) => (r.metadata as { joinCode?: string } | undefined)?.joinCode === code,
        );
        if (!room) return res.status(404).json({ error: 'not found' });
        const meta = room.metadata as {
          phase?: string;
          playerCount?: number;
          maxPlayers?: number;
        };
        return res.json({
          roomId: room.roomId,
          phase: meta.phase ?? 'waiting',
          playerCount: meta.playerCount ?? 0,
          maxPlayers: meta.maxPlayers ?? 5,
        });
      } catch {
        return res.status(500).json({ error: 'lookup failed' });
      }
    });

    app.use('/colyseus', monitor());

    // Serve the built client (single Fly app hosts both). Skipped in local dev
    // where the Vite dev server owns the UI and no dist/ exists.
    const clientDist = path.resolve(__dirname, '../client/dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      // SPA fallback for client routes (never for API / matchmaking / monitor).
      app.get('*', (req, res, next) => {
        if (/^\/(api|colyseus|matchmake|health)/.test(req.path)) return next();
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  },
});
