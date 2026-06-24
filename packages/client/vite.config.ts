/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SERVER = 'http://127.0.0.1:2567';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  server: {
    port: 5173,
    host: 'localhost',
    cors: true,
    // Allow Discord to embed the dev server in an iframe.
    headers: {
      'Content-Security-Policy': 'frame-ancestors *',
    },
    // Proxy Colyseus matchmaking + websockets to the local game server.
    proxy: {
      '/matchmake': { target: SERVER, changeOrigin: true },
      '/colyseus': { target: SERVER, changeOrigin: true },
      '/ws': { target: SERVER.replace('http', 'ws'), ws: true },
    },
  },
});
