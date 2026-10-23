-- Per-provider, per-week Gym Supervision Services and distinct Client
-- names — same shape and same source (the regular weekly Activity Report
-- upload) as pre_employment_activity_weekly, just for gym classes instead
-- of pre-employment screenings. Summed over a trailing 52 weeks this gives
-- the rolling-12-month subtraction NCVA now needs — a provider who runs
-- weekly gym classes (e.g. an EP coach) has those sessions counted as
-- "Completed Services" by Nookal just like a real 1:1 consult, silently
-- inflating NCVA. Same shape of problem PVA already solved for
-- pre-employment screenings inflating UCVA.
--
-- Scoped to data_entry/director from the start (not "any authenticated
-- user", the mistake pre_employment_activity_weekly/no_future_booking_events
-- were created with and only fixed later — see the 23/10/26 security audit).
create table gym_class_activity_weekly (
  provider_id uuid not null references providers(id) on delete cascade,
  week_ending date not null,
  services int not null,
  client_names jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (provider_id, week_ending)
);

alter table gym_class_activity_weekly enable row level security;
create policy "data entry scoped" on gym_class_activity_weekly for all using (
  is_director_user() or can_access_section('data_entry')
) with check (
  is_director_user() or can_access_section('data_entry')
);
