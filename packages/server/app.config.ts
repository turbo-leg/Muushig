import config from '@colyseus/tools';
import { monitor } from '@colyseus/monitor';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import cors from 'cors';
import express from 'express';
import { MuushigRoom } from './src/rooms/MuushigRoom';

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

    app.use('/colyseus', monitor());
  },
});
