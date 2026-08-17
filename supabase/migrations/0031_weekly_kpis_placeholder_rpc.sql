-- Fixes: Marcio (and any other restricted staff_access login) got "not
-- saved" on every single save — Meeting Notes, KPI Scorecard, Action Steps,
-- Goals, all of it.
--
-- Root cause: /api/provider-weekly and /api/action-steps both guard against
-- provider_weekly's FK into weekly_kpis(week_ending) by upserting a
-- placeholder {week_ending} row first, using Prefer: resolution=ignore-
-- duplicates (INSERT ... ON CONFLICT DO NOTHING). For an insert that turns
-- out to conflict with an existing row, Postgres must be able to *see* that
-- existing row under the table's own RLS SELECT policy to silently skip it
-- — otherwise it can't tell "already there, skip" apart from "you're not
-- allowed to know if this exists", and raises a row-security error instead
-- of guessing. weekly_kpis' SELECT policy (migration 0029) is director-only
-- (real clinic financials), so a restricted login gets exactly that error
-- the moment the week already has a row — which is effectively always,
-- since a director's own Nookal upload creates that row well before a
-- restricted login ever visits the page. A brand-new week (no conflict)
-- inserts fine either way, which is why this was easy to miss in testing.
--
-- Fix: do the placeholder insert inside a SECURITY DEFINER function instead
-- of a raw table upsert — same trick as is_director_user()/
-- can_access_provider_role() in 0029. It runs with elevated privilege for
-- this one narrow, harmless operation (insert-if-missing, no columns beyond
-- the date, nothing read back), so it no longer needs the caller to have
-- SELECT on weekly_kpis — the confidentiality boundary on the real
-- financial columns is untouched.
create or replace function ensure_weekly_kpis_row(p_week_ending date) returns void
language sql security definer set search_path = public as $$
  insert into weekly_kpis (week_ending) values (p_week_ending)
  on conflict (week_ending) do nothing;
$$;

grant execute on function ensure_weekly_kpis_row(date) to authenticated;
