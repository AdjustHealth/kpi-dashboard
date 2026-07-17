-- ============================================================
-- ONE-OFF SETUP SCRIPT — run this once in the Supabase SQL Editor.
-- Not part of the numbered migration sequence; safe to re-run (every
-- statement is guarded so it won't create duplicates or clobber data).
-- Also safe to run even if you already ran an earlier version of this
-- script — section 2 corrects Michael/Nick if they're already there.
--
-- What this does:
--   1. Adds the pending schema columns (revenue-by-payer, senior CVA).
--   2. Removes Michael (you're a director, not a tracked provider) and
--      fixes Nick to physio / 2-5yr tier if either was already added by
--      an earlier run of this script.
--   3. Adds the KPI Scorecard targets to your two existing senior physios
--      (Sam Johnson, Marcio dos Santos) without touching their existing
--      bonus tiers / specialty targets.
--   4. Adds the rest of the team with the same targets, and the admin
--      team with the admin KPI targets from your screenshot.
--
-- IMPORTANT: names below are first-name-only where I don't have a
-- confirmed surname. Check the Settings page after running this and
-- correct spelling to exactly match your Nookal exports — CSV auto-fill
-- matches on exact name (case-insensitive, but spelling must match).
-- ============================================================

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
delete from providers where lower(name) = 'michael';

update providers
set role = 'physio', targets = targets || '{"experience_tier":"2_5yr"}'::jsonb
where lower(name) = 'nick';

-- ------------------------------------------------------------
-- 3. KPI Scorecard targets for your two already-seeded senior physios
--    (merges in — doesn't overwrite personal_cva / bonus_tiers / etc.)
--    senior_since = 2026-07-01, from the "Start Date (Week 1)" cell on
--    your senior-physio meeting sheet — bonus-tier cumulative turnover
--    now only counts weeks from this date forward, not everything in
--    the history window.
-- ------------------------------------------------------------
update providers
set targets = targets || '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5,"senior_since":"2026-07-01"}'::jsonb
where lower(name) in ('sam johnson', 'marcio dos santos');

-- Sam's "Memberships" specialty target was missing (target 75 on your sheet).
update providers
set targets = targets || '{"memberships":75}'::jsonb
where lower(name) = 'sam johnson';

-- ------------------------------------------------------------
-- 4. The rest of the physio team (KPI Scorecard target set:
--    FBA >=2, Occupancy 80%, New Patient Booking Rate 5, DNAs <2,
--    Cancellations <20, Not Rebooked <5, Voxers 100% — from your
--    screenshot, skipping the red rows: Diary Management / Reschedule
--    Rate / Booked Within 7 Days, which aren't tracked per-physio)
-- ------------------------------------------------------------

-- Nick — mid-tier (2-5yr) physio for now
insert into providers (name, role, targets, sort_order)
select 'Nick', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 11
where not exists (select 1 from providers where lower(name) = 'nick');

-- New grad physios
insert into providers (name, role, targets, sort_order)
select 'Imogen', 'physio', '{"experience_tier":"new_grad","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 12
where not exists (select 1 from providers where lower(name) = 'imogen');

insert into providers (name, role, targets, sort_order)
select 'Riley', 'physio', '{"experience_tier":"new_grad","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 13
where not exists (select 1 from providers where lower(name) = 'riley');

-- 2-5yr physios
insert into providers (name, role, targets, sort_order)
select 'Ilan', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 14
where not exists (select 1 from providers where lower(name) = 'ilan');

insert into providers (name, role, targets, sort_order)
select 'Samantha', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 15
where not exists (select 1 from providers where lower(name) = 'samantha');

insert into providers (name, role, targets, sort_order)
select 'Tayla', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 16
where not exists (select 1 from providers where lower(name) = 'tayla');

insert into providers (name, role, targets, sort_order)
select 'Wilson', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 17
where not exists (select 1 from providers where lower(name) = 'wilson');

insert into providers (name, role, targets, sort_order)
select 'Dean', 'physio', '{"experience_tier":"2_5yr","fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 18
where not exists (select 1 from providers where lower(name) = 'dean');

-- EP
insert into providers (name, role, targets, sort_order)
select 'Lachlan', 'ep', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 19
where not exists (select 1 from providers where lower(name) = 'lachlan');

-- Massage
insert into providers (name, role, targets, sort_order)
select 'Jake', 'massage', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 20
where not exists (select 1 from providers where lower(name) = 'jake');

insert into providers (name, role, targets, sort_order)
select 'Erin', 'massage', '{"fba":2,"occupancy_pct":0.80,"new_pt_booking_rate":5,"voxers_completed_pct":1.00,"dnas":2,"cancellations":20,"not_rebooked":5}'::jsonb, 21
where not exists (select 1 from providers where lower(name) = 'erin');

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
select 'Dayle', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 23
where not exists (select 1 from providers where lower(name) = 'dayle');

insert into providers (name, role, targets, sort_order)
select 'Koreena', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 24
where not exists (select 1 from providers where lower(name) = 'koreena');

insert into providers (name, role, targets, sort_order)
select 'Edi', 'admin', '{"diary_management_pct":0.90,"reschedule_rate_pct":0.30,"cancellations_not_rebooked_pct":0.30,"booked_within_7_days_pct":0.30,"avg_days_to_next_booking":14,"follow_up_phone_calls_pct":1.00,"obv_not_sent":0,"rx_notes_made_pct":0.75,"answered_calls_pct":0.90}'::jsonb, 25
where not exists (select 1 from providers where lower(name) = 'edi');
