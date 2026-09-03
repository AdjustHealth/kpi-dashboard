-- Per-provider, per-week Services and distinct Client names from the
-- Activity Report's Details section, counting only rows that are NOT
-- corporate-screening/pre-employment (Village/Move OT/Biosym/Pre-Employment)
-- — the same population Nookal's own UCVA already excludes via the Business
-- Performance Report's Payers filter. Captured every week going forward so a
-- true rolling-12-month Patient Visit Average (Services / Unique Patients)
-- can eventually be computed on the same footing as UCVA, without needing a
-- Nookal-side Payers-filtered export (a 12-month Activity Report export
-- crashes Nookal — confirmed 3/9/26, even split by quarter).
create table activity_pva_weekly (
  provider_id uuid not null references providers(id) on delete cascade,
  week_ending date not null references weekly_kpis(week_ending) on delete cascade,
  services int not null,
  client_names jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (provider_id, week_ending)
);

alter table activity_pva_weekly enable row level security;
create policy "authenticated full access" on activity_pva_weekly
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
