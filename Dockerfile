# Single image: builds the client and runs the Colyseus server (which also
# serves the built client). The server runs via ts-node, so dev deps stay
# installed at runtime — do NOT prune them.
FROM node:22-slim
ENV HUSKY=0
WORKDIR /app

# Install workspace deps (cached on the lockfile). All workspace package.json
# files must be present so npm can link @muushig/* together.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

# App source.
COPY . .

# Public client config baked in at build time (safe to expose). Pass with
# `fly deploy --build-arg VITE_DISCORD_CLIENT_ID=... ` etc.
ARG VITE_DISCORD_CLIENT_ID=""
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build -w @muushig/client

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start:prod", "-w", "@muushig/server"]
