-- Adds revenue-by-payer columns to weekly_kpis, populated by the Activity
-- Report CSV parser (lib/nookal/parsers.ts) for the Revenue page's payer
-- mix pie chart. Run this after 0001_init.sql.

alter table weekly_kpis
  add column if not exists rev_private numeric,
  add column if not exists rev_medicare numeric,
  add column if not exists rev_dva numeric,
  add column if not exists rev_workcover numeric,
  add column if not exists rev_ndis numeric,
  add column if not exists rev_other numeric;
