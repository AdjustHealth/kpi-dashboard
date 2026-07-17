-- ============================================================
-- ONE-OFF SETUP SCRIPT — run this once in the Supabase SQL Editor.
-- Not part of the numbered migration sequence; safe to re-run (every
-- statement is guarded so it won't create duplicates or clobber data).
-- Also safe to run even if you already ran an earlier version of this
-- script — section 2 corrects names/roles if they're already there.
--
-- What this does:
--   0. Dedupes any provider that ended up with 2+ rows under the same
--      name (e.g. from an earlier partial run) — merges any weekly data
--      into one row before deleting the rest.
--   1. Adds the pending schema columns (revenue-by-payer, senior CVA,
--      specialty consult counts).
--   2. Removes Anika Woodford (director, not tracked) and adds Michael
--      Houbert as a regular physio (director, but still tracked — just
--      not on the Senior Physio tab) if either was already added by an
--      earlier run. Fixes Nick to physio / 2-5yr tier likewise.
--   3. Adds the KPI Scorecard targets to your two existing senior physios
--      (Sam Johnston, Marcio dos Santos) without touching their existing
--      bonus tiers / specialty targets.
--   4. Adds the rest of the team with the same targets, and the admin
--      team with the admin KPI targets from your screenshot.
--
-- ALL team member full names below are now confirmed directly from the
-- real Nookal provider dropdown screenshot: Anika Woodford, Dean Walker,
-- Erin Duthie, Ilan Berkowitz, Imogen O'Neill, Jake Mitchell, Lachlan
-- Brazier, Marcio Dos Santos, Michael Houbert, Nick Baxter, Riley
-- Fairhurst, Sam Johnston, Tayla Cattanach, Wilson Page. Sarah is still
-- first-name-only — check Settings and correct her spelling to match
-- your Nookal exports exactly, or CSV auto-fill won't match her.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Dedupe any duplicate provider rows (same name + role) — safe to
--    re-run, no-op once there are no duplicates left. Keeps the row with
--    the lowest sort_order (or lowest id as a tiebreak), merges any
--    provider_weekly history from the other row(s) into it, then deletes
--    the duplicate row(s).
-- ------------------------------------------------------------
create temporary table _dup_losers as
with dups as (
  select name, role, array_agg(id order by sort_order, id) as ids
  from providers
  group by name, role
  having count(*) > 1
)
select unnest(ids[2:array_length(ids, 1)]) as loser_id, ids[1] as keeper_id
from dups;

insert into provider_weekly (provider_id, week_ending, metrics, kpas, meeting_notes)
select d.keeper_id, pw.week_ending, pw.metrics, pw.kpas, pw.meeting_notes
from _dup_losers d
join provider_weekly pw on pw.provider_id = d.loser_id
on conflict (provider_id, week_ending) do update
  set metrics = provider_weekly.metrics || excluded.metrics,
      kpas = provider_weekly.kpas || excluded.kpas,
      meeting_notes = provider_weekly.meeting_notes || excluded.meeting_notes;

delete from provider_weekly where provider_id in (select loser_id from _dup_losers);
delete from providers where id in (select loser_id from _dup_losers);

drop table _dup_losers;

-- ------------------------------------------------------------
-- 1. Pending columns + the Providers & Practice upload fix
--    (this constraint update is what's been causing that error)
-- ------------------------------------------------------------
alter table weekly_kpis
  add column if not exists rev_private numeric,
  add column if not exists rev_medicare numeric,
  add column if not exists rev_dva numeric,
  add column if not exists rev_workcover numeric,
  add column if not exists rev_ndis numeric,
  add column if not exists rev_other numeric,
  add column if not exists cva_senior numeric;

alter table nookal_uploads drop constraint if exists nookal_uploads_report_type_check;
alter table nookal_uploads add constraint nookal_uploads_report_type_check check (report_type in (
  'activity', 'business_performance', 'occupancy',
  'clients_and_cases', 'providers_and_practice', 'cancellations', 'aged_debtors'
));

-- ------------------------------------------------------------
-- 2. Corrections (no-op if these were never added)
-- ------------------------------------------------------------
-- Anika is a director, not a tracked provider. Michael is ALSO a director,
-- but (per your latest confirmation) he still sees clients and should be
-- tracked as a regular physio — just off the Senior Physio tab, not
-- excluded entirely like an earlier round assumed.
delete from providers where lower(name) in ('anika', 'anika woodford');
update providers set name = 'Michael Houbert' where lower(name) = 'michael';

-- CORRECTION: an earlier version of this script deleted "Samantha" on the
-- assumption she was a guessed placeholder duplicate of Sam Johnston. She
-- is not — the director's own KPI source-tracking sheet confirms "Samantha
-- Delohery" is a real, separate 2-5yr physio. If she was deleted by an
-- earlier run of this script, this re-adds her (section 4 below).
update providers set name = 'Samantha Delohery' where lower(name) = 'samantha';

update providers
set role = 'physio', targets = targets || '{"experience_tier":"2_5yr"}'::jsonb
where lower(name) in ('nick', 'nick baxter');

-- Real full names confirmed from your actual Nookal provider dropdown —
-- renames whichever first-name-only (or misspelled) placeholder is still
-- sitting there so CSV auto-fill (which matches on exact name) works.
update providers set name = 'Dean Walker' where lower(name) = 'dean';
update providers set name = 'Nick Baxter' where lower(name) = 'nick';
update providers set name = 'Tayla Cattanach' where lower(name) = 'tayla';
update providers set name = 'Erin Duthie' where lower(name) = 'erin';
update providers set name = 'Jake Mitchell' where lower(name) = 'jake';
update providers set name = 'Koreena Nesbitt' where lower(name) = 'koreena';
update providers set name = 'Dayle Cobern' where lower(name) = 'dayle';
update providers set name = 'Edi Henderson' where lower(name) = 'edi';
update providers set name = 'Sam Johnston' where lower(name) in ('sam johnson', 'sam');
update providers set name = 'Ilan Berkowitz' where lower(name) = 'ilan';
update providers set name = 'Imogen O''Neill' where lower(name) = 'imogen';
update providers set name = 'Lachlan Brazier' where lower(name) = 'lachlan';
update providers set name = 'Riley Fairhurst' where lower(name) = 'riley';
update providers set name = 'Wilson Page' where lower(name) = 'wilson';

-- ------------------------------------------------------------
-- 3. KPI Scorecard targets for your two already-seeded senior physios
--    (merges in — doesn't overwrite personal_cva / bonus_tiers / etc.)
--    senior_since = 2026-07-01, from the "Start Date (Week 1)" cell on
--    your senior-physio meeting sheet — bonus-tier cumulative turnover
--    now only counts weeks from this date forward, not everything in
--    the history window.
-- ------------------------------------------------------------
update providers
set targets = targets || '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30,"senior_since":"2026-07-01"}'::jsonb
where lower(name) in ('sam johnston', 'marcio dos santos');

-- Sam's "Memberships" specialty target was missing (target 75 on your sheet).
update providers
set targets = targets || '{"memberships":75}'::jsonb
where lower(name) = 'sam johnston';

-- ------------------------------------------------------------
-- 4. The rest of the physio team (KPI Scorecard target set:
--    FBA >=2, Occupancy 80%, New Patient Booking Rate 5, DNAs <2,
--    Cancellations <20, Not Rebooked <5, Voxers 100% — from your
--    screenshot, skipping the red rows: Diary Management / Reschedule
--    Rate / Booked Within 7 Days, which aren't tracked per-physio)
-- ------------------------------------------------------------

-- Nick Baxter — mid-tier (2-5yr) physio for now
insert into providers (name, role, targets, sort_order)
select 'Nick Baxter', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 11
where not exists (select 1 from providers where lower(name) in ('nick', 'nick baxter'));

-- Michael Houbert — director who still sees clients; tracked as a regular
-- physio (Providers tab), not on the Senior Physio tab.
insert into providers (name, role, targets, sort_order)
select 'Michael Houbert', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 9
where not exists (select 1 from providers where lower(name) in ('michael', 'michael houbert'));

-- New grad physios
insert into providers (name, role, targets, sort_order)
select 'Imogen O''Neill', 'physio', '{"experience_tier":"new_grad","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 12
where not exists (select 1 from providers where lower(name) in ('imogen', 'imogen o''neill'));

insert into providers (name, role, targets, sort_order)
select 'Riley Fairhurst', 'physio', '{"experience_tier":"new_grad","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 13
where not exists (select 1 from providers where lower(name) in ('riley', 'riley fairhurst'));

-- 2-5yr physios
insert into providers (name, role, targets, sort_order)
select 'Ilan Berkowitz', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 14
where not exists (select 1 from providers where lower(name) in ('ilan', 'ilan berkowitz'));

insert into providers (name, role, targets, sort_order)
select 'Tayla Cattanach', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 16
where not exists (select 1 from providers where lower(name) in ('tayla', 'tayla cattanach'));

insert into providers (name, role, targets, sort_order)
select 'Wilson Page', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 17
where not exists (select 1 from providers where lower(name) in ('wilson', 'wilson page'));

insert into providers (name, role, targets, sort_order)
select 'Dean Walker', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 18
where not exists (select 1 from providers where lower(name) in ('dean', 'dean walker'));

insert into providers (name, role, targets, sort_order)
select 'Samantha Delohery', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 15
where not exists (select 1 from providers where lower(name) in ('samantha', 'samantha delohery'));

-- EP
insert into providers (name, role, targets, sort_order)
select 'Lachlan Brazier', 'ep', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 19
where not exists (select 1 from providers where lower(name) in ('lachlan', 'lachlan brazier'));

-- Massage
insert into providers (name, role, targets, sort_order)
select 'Jake Mitchell', 'massage', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 20
where not exists (select 1 from providers where lower(name) in ('jake', 'jake mitchell'));

insert into providers (name, role, targets, sort_order)
select 'Erin Duthie', 'massage', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked_pct":0.30}'::jsonb, 21
where not exists (select 1 from providers where lower(name) in ('erin', 'erin duthie'));

-- ------------------------------------------------------------
-- 5. Admin team (targets from your admin KPI screenshot: Diary
--    Management 90%, Reschedule Rate >30%, Cancellations Not Rebooked
--    <30%, Booked Within 7 Days >30%, Avg Days to Next Booking <14,
--    Follow Up Phone Calls 100%, OBV Number Not Sent 0, Rx Notes Made
--    75%, Answered Calls 90%)
-- ------------------------------------------------------------
insert into providers (name, role, targets, sort_order)
select 'Sarah', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 22
where not exists (select 1 from providers where lower(name) = 'sarah');

insert into providers (name, role, targets, sort_order)
select 'Dayle Cobern', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 23
where not exists (select 1 from providers where lower(name) in ('dayle', 'dayle cobern'));

insert into providers (name, role, targets, sort_order)
select 'Koreena Nesbitt', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 24
where not exists (select 1 from providers where lower(name) in ('koreena', 'koreena nesbitt'));

insert into providers (name, role, targets, sort_order)
select 'Edi Henderson', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 25
where not exists (select 1 from providers where lower(name) in ('edi', 'edi henderson'));
