-- Add active_back and unlocked_backs columns to profiles
alter table public.profiles
  add column if not exists active_back text not null default 'emerald',
  add column if not exists unlocked_backs text not null default 'emerald';

-- Creates buy_card_back RPC function to securely deduct coins and unlock the skin.
create or replace function public.buy_card_back(item_name text, cost integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  player_coins integer;
  owned_list text;
begin
  -- Get current coins and unlocked list
  select coins, unlocked_backs 
    into player_coins, owned_list
    from public.profiles
   where id = auth.uid();

  -- Verify coins
  if player_coins < cost then
    return false;
  end if;

  -- Verify not already owned
  if position(item_name in owned_list) > 0 then
    return false;
  end if;

  -- Deduct coins and add to unlocked list
  update public.profiles
     set coins = coins - cost,
         unlocked_backs = unlocked_backs || ',' || item_name
   where id = auth.uid();

  return true;
end;
$$;
