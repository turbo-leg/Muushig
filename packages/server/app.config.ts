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

    app.use('/colyseus', monitor());
  },
});
