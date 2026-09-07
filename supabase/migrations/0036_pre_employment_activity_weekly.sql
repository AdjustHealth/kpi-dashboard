-- Per-provider, per-week pre-employment/corporate-screening Services and
-- distinct Client names — captured from the director's REGULAR weekly
-- Activity Report upload (the one she already does every week for JBV/
-- revenue/specialty counts), no separate export needed. Summed over a
-- trailing 52 weeks this gives the real rolling-12-month "pre-employment"
-- subtraction for PVA, replacing the one-off/re-run-weekly
-- activity_pre_employment_12mo report — the director found running that
-- extra Payers-filtered 12-month export every week "annoying" given she's
-- already uploading a normal Activity Report every week that contains the
-- same pre-employment rows anyway.
--
-- Seeded once (see the backfill run alongside this migration) using the
-- one 12-month Payers-filtered export already provided, bucketed by each
-- row's own Date into its real historical week_ending — so the rolling
-- window starts genuinely full instead of taking ~12 months to build up.
-- No FK to weekly_kpis(week_ending) here (unlike cancellation_events) —
-- the seed backfill below covers real historical weeks back to 31/08/2025,
-- and weekly_kpis only goes back to 2026-01-03, so tying this to that
-- table would reject the older seeded weeks the FK would otherwise demand
-- exist there first.
create table pre_employment_activity_weekly (
  provider_id uuid not null references providers(id) on delete cascade,
  week_ending date not null,
  services int not null,
  client_names jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (provider_id, week_ending)
);

alter table pre_employment_activity_weekly enable row level security;
create policy "authenticated full access" on pre_employment_activity_weekly
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
