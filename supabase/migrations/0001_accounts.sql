-- Muushig accounts: profiles, stats, and match history.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

-- ─────────────────────────── Tables ───────────────────────────

-- One profile row per authenticated user (mirrors auth.users).
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Aggregate stats per player (win % is derived in the app).
create table if not exists public.player_stats (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  games_played  integer not null default 0,
  games_won     integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- One row per finished game.
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  player_count integer not null,
  finished_at  timestamptz not null default now()
);

-- One row per player per finished game (for match history).
create table if not exists public.match_results (
  id          bigint generated always as identity primary key,
  match_id    uuid not null references public.matches (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  won         boolean not null default false,
  score       integer not null,                       -- final penalty score
  opponents   text[]  not null default '{}',          -- opponent usernames, for quick display
  created_at  timestamptz not null default now()
);

create index if not exists match_results_user_recent
  on public.match_results (user_id, created_at desc);

-- ─────────────────────────── Row-level security ───────────────────────────
-- Profiles & stats & history are world-readable (opponent names, leaderboards).
-- Writes to stats/matches happen ONLY via the service role (game server), which
-- bypasses RLS — so no write policies are granted to normal users for those.

alter table public.profiles      enable row level security;
alter table public.player_stats  enable row level security;
alter table public.matches       enable row level security;
alter table public.match_results enable row level security;

create policy "profiles are public"        on public.profiles      for select using (true);
create policy "own profile is editable"    on public.profiles      for update using (auth.uid() = id);
create policy "stats are public"           on public.player_stats  for select using (true);
create policy "matches are public"         on public.matches       for select using (true);
create policy "results are public"         on public.match_results for select using (true);

-- ─────────────────────────── New-user trigger ───────────────────────────
-- On signup, create the profile + an empty stats row from the OAuth metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1),
      'Player'
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  insert into public.player_stats (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── Record-a-match RPC ───────────────────────────
-- The game server calls this once per finished game (service role) to insert the
-- match, the per-player results, and bump stats — all in one transaction.
--   players: jsonb array of { user_id, won, score, opponents: text[] }

create or replace function public.record_match(players jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_match_id uuid;
  p jsonb;
begin
  insert into public.matches (player_count)
  values (jsonb_array_length(players))
  returning id into new_match_id;

  for p in select * from jsonb_array_elements(players)
  loop
    insert into public.match_results (match_id, user_id, won, score, opponents)
    values (
      new_match_id,
      (p->>'user_id')::uuid,
      coalesce((p->>'won')::boolean, false),
      (p->>'score')::integer,
      coalesce(
        array(select jsonb_array_elements_text(p->'opponents')),
        '{}'
      )
    );

    update public.player_stats
       set games_played = games_played + 1,
           games_won    = games_won + (case when (p->>'won')::boolean then 1 else 0 end),
           updated_at   = now()
     where user_id = (p->>'user_id')::uuid;
  end loop;

  return new_match_id;
end;
$$;
