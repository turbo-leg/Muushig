# Discord Activity setup

How to register and run Muushig as a Discord Activity. One-time setup in the
[Discord Developer Portal](https://discord.com/developers/applications), plus
a few secrets on the server.

## 1. Application

1. Developer Portal → **New Application** (or open the existing one).
2. Note the **Application ID** — this is `DISCORD_CLIENT_ID` /
   `VITE_DISCORD_CLIENT_ID`.
3. **OAuth2** page: note the **Client Secret** — `DISCORD_CLIENT_SECRET`
   (server-only; never ships to the client).
4. OAuth2 → **Redirects**: add your app origin (e.g.
   `https://muushig.fly.dev`). The Embedded App SDK handles the actual flow;
   the redirect just has to be registered.

## 2. Enable the Activity

1. Left sidebar → **Activities** → enable.
2. **URL Mappings** — the activity is served through Discord's proxy, so map:

   | Prefix | Target            |
   | ------ | ----------------- |
   | `/`    | `muushig.fly.dev` |

   All API calls (`/api/token`, `/api/table/:code`, `/api/client-error`) and
   the Colyseus WebSocket ride the same origin, so one root mapping is enough.

3. **Settings**: enable the activity for the installation contexts you want
   (guild voice channels is the main one). Add an Entry Point command if you
   want it in the App Launcher.

## 3. Server secrets (Fly)

```bash
fly secrets set \
  DISCORD_CLIENT_ID=<application id> \
  DISCORD_CLIENT_SECRET=<oauth2 client secret> \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

- `DISCORD_CLIENT_ID/SECRET` power `/api/token` (the OAuth code → access-token
  exchange). Without them, Discord users play as guests with generated names.
- `SUPABASE_*` power identity verification and match/stats recording. Apply
  `supabase/migrations/0001` + `0002` (SQL editor or `supabase db push`)
  **before** setting these. Without them the game runs with stats disabled.

## 4. Client build vars

Baked at image build time (see `Dockerfile` / deploy command):

```bash
fly deploy --remote-only \
  --build-arg VITE_DISCORD_CLIENT_ID=... \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_ANON_KEY=...
```

The anon key is publishable (RLS gates everything to world-SELECT).

## 5. Local testing inside Discord

1. `npm run dev` (server :2567 + Vite :5173).
2. Expose the client with a tunnel, e.g. `cloudflared tunnel --url http://localhost:5173`.
3. Point the Activity's URL mapping `/` at the tunnel host (use a separate
   development application so production mappings stay untouched).
4. In Discord: User Settings → Advanced → **Developer Mode** on; launch the
   activity from a voice channel.

On the plain web, none of this is needed — `https://muushig.fly.dev` serves
the same client with the Lobby (quick play / host a table / join code), and
Discord OAuth is replaced by Supabase sign-in.
