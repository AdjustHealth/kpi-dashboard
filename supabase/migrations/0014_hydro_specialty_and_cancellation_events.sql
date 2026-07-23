-- Hydro as its own specialty consult category, same Init/Sub/Total pattern
-- as Vestibular/Headaches/Paeds — auto-detected from the Activity Report.
alter table weekly_kpis
  add column if not exists specialty_hydro_initial int,
  add column if not exists specialty_hydro_sub int;

alter table weekly_kpis
  add column if not exists specialty_hydro_total int generated always as (
    coalesce(specialty_hydro_initial, 0) + coalesce(specialty_hydro_sub, 0)
  ) stored;

-- Distinct clients with at least one line item on the Activity Report that
-- week (any status, not just completed) — used to compute New Patient
-- Retention (were this week's new patients still showing up N weeks later)
-- without needing a full per-client attendance ledger.
alter table weekly_kpis
  add column if not exists clients_seen_names jsonb not null default '[]';

-- ============================================================
-- Raw per-cancellation rows (not just the aggregated stats) — so the
-- director can scroll through every cancellation with the admin team in a
-- meeting, the way the old spreadsheet's Cancellations Report tab worked.
-- Re-uploading a week's Cancellations report replaces that week's rows
-- entirely (delete-then-insert), so this always reflects the latest file.
-- ============================================================
create table cancellation_events (
  id uuid primary key default gen_random_uuid(),
  week_ending date not null references weekly_kpis(week_ending) on delete cascade,
  appointment_date date,
  client text not null,
  provider text,
  case_name text,
  status text not null check (status in ('Cancelled', 'Did Not Arrive')),
  note text,
  next_booking date,
  modified_user text,
  modified_at timestamptz,
  created_at timestamptz not null default now()
);

create index cancellation_events_week_ending_idx on cancellation_events (week_ending);

alter table cancellation_events enable row level security;
create policy "authenticated full access" on cancellation_events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
