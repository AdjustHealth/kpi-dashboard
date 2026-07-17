-- Clinic-wide specialty consult counts (Vestibular/Headaches/Paeds auto-fill
-- from the Activity Report the same way JBV does; Women's Health has no CSV
-- source on the director's own sheet, so it's manual-only).
alter table weekly_kpis
  add column if not exists specialty_vestibular_initial int,
  add column if not exists specialty_vestibular_sub int,
  add column if not exists specialty_headaches_initial int,
  add column if not exists specialty_headaches_sub int,
  add column if not exists specialty_paeds_initial int,
  add column if not exists specialty_paeds_sub int,
  add column if not exists specialty_womens_health_total int;

alter table weekly_kpis
  add column if not exists specialty_vestibular_total int generated always as (
    coalesce(specialty_vestibular_initial, 0) + coalesce(specialty_vestibular_sub, 0)
  ) stored,
  add column if not exists specialty_headaches_total int generated always as (
    coalesce(specialty_headaches_initial, 0) + coalesce(specialty_headaches_sub, 0)
  ) stored,
  add column if not exists specialty_paeds_total int generated always as (
    coalesce(specialty_paeds_initial, 0) + coalesce(specialty_paeds_sub, 0)
  ) stored;
