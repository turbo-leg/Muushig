-- Premium accounts: gates CREATING custom lobbies (named tables, seat counts,
-- private join codes). Joining tables and quick play stay free.
-- For now the flag is set manually in the dashboard; a payment flow can flip
-- the same column later.

alter table public.profiles
  add column if not exists premium boolean not null default false;

-- profiles is already world-SELECT (0001), so the client can read its own
-- flag to render the host section; the server verifies it with the service
-- role at room creation, so the client value is display-only.
