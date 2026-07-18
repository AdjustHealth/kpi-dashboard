-- Women's Health now auto-fills from the Activity Report the same way
-- Vestibular/Headaches/Paeds do (see lib/nookal/parsers.ts's
-- SPECIALTY_CATEGORY_PATTERNS) — needs the missing _sub column and a
-- generated _total to match that Init/Sub/Total pattern. specialty_womens_
-- health_total previously existed as a plain manual int with no data ever
-- written to it (nothing wired it up); safe to drop and recreate generated.
alter table weekly_kpis drop column if exists specialty_womens_health_total;

alter table weekly_kpis
  add column if not exists specialty_womens_health_initial int,
  add column if not exists specialty_womens_health_sub int;

alter table weekly_kpis
  add column if not exists specialty_womens_health_total int generated always as (
    coalesce(specialty_womens_health_initial, 0) + coalesce(specialty_womens_health_sub, 0)
  ) stored;

-- Admin "Meeting Prep" fields the director enters once, shared identically
-- across every admin staff member's page — not each admin's own individual
-- number (matching how diary_mgmt_pct and admin_followup_calls already
-- work). OBV Number Not Sent / Rx Notes Made / Answered Calls move here
-- from per-provider provider_weekly.metrics.
alter table weekly_kpis
  add column if not exists admin_obv_not_sent int,
  add column if not exists admin_rx_notes_pct numeric,
  add column if not exists admin_answered_calls_pct numeric;
