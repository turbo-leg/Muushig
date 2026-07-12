-- Harden the exposed API surface (from Supabase security advisors).
-- record_match / record_match_v2 must only be callable by the game server
-- (service role, which bypasses these grants); handle_new_user only ever
-- runs as a trigger; rls_auto_enable is a Supabase-managed event trigger.
-- The leaderboard view runs with the caller's rights — the underlying
-- tables are world-SELECT via RLS, so results are unchanged.

alter view public.leaderboard set (security_invoker = on);

revoke execute on function public.record_match(jsonb)    from public, anon, authenticated;
revoke execute on function public.record_match_v2(jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()      from public, anon, authenticated;
