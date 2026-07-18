-- Add coins column to profiles
alter table public.profiles
  add column if not exists coins integer not null default 100;

-- Recreate record_match_v2 to credit coins to players.
-- Every game finished grants:
--   - 1st place (placement = 1): +20 coins
--   - 2nd place (placement = 2): +10 coins
--   - 3rd place (placement = 3): +5 coins
--   - Others/participation: +2 coins
--   - Trick reward: +1 coin per trick won
create or replace function public.record_match_v2(match jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_match_id uuid;
  p jsonb;
  r jsonb;
  won_tricks integer;
  place integer;
  earned_coins integer;
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

    -- Payout coins to profiles
    won_tricks := coalesce((p->'stats'->>'tricks')::integer, 0);
    place      := (p->>'placement')::integer;
    
    earned_coins := case 
      when place = 1 then 20
      when place = 2 then 10
      when place = 3 then 5
      else 2
    end + won_tricks;

    update public.profiles
       set coins = coins + earned_coins
     where id = (p->>'user_id')::uuid;
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
