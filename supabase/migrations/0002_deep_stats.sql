-- Muushig deep stats: per-round match history, extended rollups, Elo rating,
-- and a public leaderboard. Additive on top of 0001_accounts.sql — the v1
-- record_match RPC is left untouched for compatibility.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- IMPORTANT: apply this migration BEFORE deploying the server that calls
-- record_match_v2.

-- ─────────────────────────── Extended columns ───────────────────────────

alter table public.matches
  add column if not exists rounds_played    integer not null default 0,
  add column if not exists duration_seconds integer not null default 0,
  -- True when a lobby bot held a seat: recorded, but rating never moves.
  add column if not exists with_bots        boolean not null default false;

alter table public.match_results
  add column if not exists placement integer,                     -- 1 = best final score
  -- Per-match deep stats snapshot, incl. rating_before / rating_after:
  -- { roundsStayed, roundsFolded, tricks, shutoutsTaken, shutoutsInflicted,
  --   navshih, haranhuiForced, perfectRounds, rating_before, rating_after }
  add column if not exists stats     jsonb   not null default '{}';

alter table public.player_stats
  add column if not exists rounds_played      integer not null default 0,
  add column if not exists rounds_stayed      integer not null default 0,
  add column if not exists rounds_folded      integer not null default 0,
  add column if not exists tricks_won_total   integer not null default 0,
  add column if not exists shutouts_taken     integer not null default 0,   -- got "muushig'd"
  add column if not exists shutouts_inflicted integer not null default 0,
  add column if not exists navshih_count      integer not null default 0,
  add column if not exists haranhui_count     integer not null default 0,
  add column if not exists perfect_rounds     integer not null default 0,   -- 5/5 tricks
  add column if not exists current_streak     integer not null default 0,   -- +N wins / -N losses
  add column if not exists best_win_streak    integer not null default 0,
  add column if not exists rating             integer not null default 1000,
  add column if not exists rating_games       integer not null default 0;

-- ─────────────────────────── Per-round history ───────────────────────────
-- One row per seat per scored round. user_id is null for bots and guests, so
-- every seat is preserved (match_results stays humans-only — its FK is strict).

create table if not exists public.match_rounds (
  id              bigint generated always as identity primary key,
  match_id        uuid    not null references public.matches (id) on delete cascade,
  round_no        integer not null,
  user_id         uuid    references public.profiles (id) on delete set null,
  seat            text    not null,                    -- display name at time of play
  is_bot          boolean not null default false,
  stayed          boolean not null,
  tricks_won      integer not null default 0,
  shut_out        boolean not null default false,      -- stayed and took nothing (+5)
  navshih_used    boolean not null default false,      -- dealer traded the trump card
  haranhui_forced boolean not null default false,      -- fold cap forced the stay
  score_after     integer not null
);

create index if not exists match_rounds_by_match on public.match_rounds (match_id, round_no);
create index if not exists match_rounds_by_user
  on public.match_rounds (user_id) where user_id is not null;

alter table public.match_rounds enable row level security;
create policy "rounds are public" on public.match_rounds for select using (true);

-- ─────────────────────────── Leaderboard view ───────────────────────────

create or replace view public.leaderboard as
  select p.username,
         p.avatar_url,
         s.rating,
         s.games_played,
         s.games_won,
         s.best_win_streak
    from public.player_stats s
    join public.profiles p on p.id = s.user_id
   where s.games_played > 0
   order by s.rating desc;

-- ─────────────────────────── record_match_v2 RPC ───────────────────────────
-- Called once per finished game by the game server (service role). One
-- transaction: match row, per-human match_results (with placement + stats
-- jsonb), player_stats rollups incl. streaks + rating, and every seat's
-- per-round rows. Elo is computed by the server in TS; new_rating is null
-- for guests/bots and for bot-flagged games (rating unchanged).
--
--   match: {
--     player_count, with_bots, rounds_played, duration_seconds,
--     players: [{ user_id|null, username, won, placement, score,
--                 opponents: text[], new_rating|null, stats: {...} }],
--     rounds:  [{ round_no, user_id|null, seat, is_bot, stayed, tricks_won,
--                 shut_out, navshih_used, haranhui_forced, score_after }]
--   }

create or replace function public.record_match_v2(match jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_match_id uuid;
  p jsonb;
  r jsonb;
begin
  insert into public.matches (player_count, rounds_played, duration_seconds, with_bots)
  values (
    coalesce((match->>'player_count')::integer, jsonb_array_length(match->'players')),
    coalesce((match->>'rounds_played')::integer, 0),
    coalesce((match->>'duration_seconds')::integer, 0),
    coalesce((match->>'with_bots')::boolean, false)
  )
  returning id into new_match_id;

  for p in select * from jsonb_array_elements(match->'players')
  loop
    -- Guests and bots have no user_id: they live in opponents[] and match_rounds.
    continue when p->>'user_id' is null;

    insert into public.match_results (match_id, user_id, won, score, opponents, placement, stats)
    values (
      new_match_id,
      (p->>'user_id')::uuid,
      coalesce((p->>'won')::boolean, false),
      (p->>'score')::integer,
      coalesce(array(select jsonb_array_elements_text(p->'opponents')), '{}'),
      (p->>'placement')::integer,
      coalesce(p->'stats', '{}'::jsonb)
    );

    update public.player_stats
       set games_played       = games_played + 1,
           games_won          = games_won + (case when (p->>'won')::boolean then 1 else 0 end),
           rounds_played      = rounds_played
                                + coalesce((p->'stats'->>'roundsStayed')::integer, 0)
                                + coalesce((p->'stats'->>'roundsFolded')::integer, 0),
           rounds_stayed      = rounds_stayed      + coalesce((p->'stats'->>'roundsStayed')::integer, 0),
           rounds_folded      = rounds_folded      + coalesce((p->'stats'->>'roundsFolded')::integer, 0),
           tricks_won_total   = tricks_won_total   + coalesce((p->'stats'->>'tricks')::integer, 0),
           shutouts_taken     = shutouts_taken     + coalesce((p->'stats'->>'shutoutsTaken')::integer, 0),
           shutouts_inflicted = shutouts_inflicted + coalesce((p->'stats'->>'shutoutsInflicted')::integer, 0),
           navshih_count      = navshih_count      + coalesce((p->'stats'->>'navshih')::integer, 0),
           haranhui_count     = haranhui_count     + coalesce((p->'stats'->>'haranhuiForced')::integer, 0),
           perfect_rounds     = perfect_rounds     + coalesce((p->'stats'->>'perfectRounds')::integer, 0),
           current_streak     = case when (p->>'won')::boolean
                                     then greatest(current_streak, 0) + 1
                                     else least(current_streak, 0) - 1 end,
           best_win_streak    = greatest(
                                  best_win_streak,
                                  case when (p->>'won')::boolean
                                       then greatest(current_streak, 0) + 1
                                       else 0 end),
           rating             = coalesce((p->>'new_rating')::integer, rating),
           rating_games       = rating_games + (case when p->>'new_rating' is not null then 1 else 0 end),
           updated_at         = now()
     where user_id = (p->>'user_id')::uuid;
  end loop;

  for r in select * from jsonb_array_elements(match->'rounds')
  loop
    insert into public.match_rounds
      (match_id, round_no, user_id, seat, is_bot, stayed, tricks_won,
       shut_out, navshih_used, haranhui_forced, score_after)
    values (
      new_match_id,
      (r->>'round_no')::integer,
      (r->>'user_id')::uuid,
      coalesce(r->>'seat', '?'),
      coalesce((r->>'is_bot')::boolean, false),
      coalesce((r->>'stayed')::boolean, false),
      coalesce((r->>'tricks_won')::integer, 0),
      coalesce((r->>'shut_out')::boolean, false),
      coalesce((r->>'navshih_used')::boolean, false),
      coalesce((r->>'haranhui_forced')::boolean, false),
      coalesce((r->>'score_after')::integer, 0)
    );
  end loop;

  return new_match_id;
end;
$$;
