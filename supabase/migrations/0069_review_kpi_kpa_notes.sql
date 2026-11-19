-- Per-row comment boxes on the review page's KPI Scorecard, Specialty KPIs,
-- and KPA Rolling Averages tables -- lets the director note WHY a specific
-- KPI/KPA was good or bad for this review, not just the number/rating
-- itself. Keyed by field key, same convention as kpi_rollups/kpa_rollups.
alter table performance_reviews
  add column if not exists kpi_notes jsonb not null default '{}'::jsonb,
  add column if not exists kpa_notes jsonb not null default '{}'::jsonb;
