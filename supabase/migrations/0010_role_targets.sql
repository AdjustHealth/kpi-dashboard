-- ============================================================
-- Role-level targets: "Providers" / "Senior" / "Admin" share one editable
-- target set instead of duplicating the same numbers on every individual
-- provider row. Genuinely individual things (bonus tier thresholds,
-- specialty metric targets, annual turnover/working weeks) stay on
-- providers.targets — only the common KPI Scorecard target fields move here.
-- ============================================================
create table role_targets (
  id text primary key check (id in ('providers', 'senior', 'admin')),
  values jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger role_targets_set_updated_at before update on role_targets
  for each row execute function set_updated_at();

alter table role_targets enable row level security;
create policy "authenticated full access" on role_targets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed each group from the values every provider in that group already
-- shares today, so effective targets don't change the moment this ships.
insert into role_targets (id, values) values
  ('providers', '{
    "fba": 2,
    "occupancy_pct": 0.8,
    "new_pt_booking_rate": 5,
    "dnas": 2,
    "cancellations": 20,
    "not_rebooked_pct": 0.3,
    "cva_target_new_grad": 4,
    "cva_target_2_5yr": 6
  }'::jsonb),
  ('senior', '{
    "fba": 2,
    "occupancy_pct": 0.8,
    "new_pt_booking_rate": 5,
    "dnas": 2,
    "cancellations": 20,
    "not_rebooked_pct": 0.3,
    "cva_target_senior": 7
  }'::jsonb),
  ('admin', '{
    "reschedule_rate_pct": 0.3,
    "avg_days_to_next_booking": 14,
    "booked_within_7_days_pct": 0.3,
    "cancellations_not_rebooked_pct": 0.3,
    "obv_not_sent": 0,
    "rx_notes_made_pct": 0.75,
    "answered_calls_pct": 0.9,
    "diary_management_pct": 0.9,
    "follow_up_phone_calls_pct": 1.0
  }'::jsonb);

-- Strip the now-grouped keys off individual providers so the group value
-- actually takes effect (an explicit per-provider value still wins if left
-- in place, which would silently defeat the point of this change).
update providers
set targets = targets
  - 'fba' - 'occupancy_pct' - 'new_pt_booking_rate' - 'dnas' - 'cancellations'
  - 'not_rebooked_pct' - 'not_rebooked' - 'ucva' - 'ncva' - 'tpr'
  - 'reschedule_rate_pct' - 'completed_consults' - 'turnover'
  - 'voxers_completed_pct'
where role in ('physio', 'massage', 'ep', 'senior_physio');

update providers
set targets = targets
  - 'reschedule_rate_pct' - 'avg_days_to_next_booking' - 'booked_within_7_days_pct'
  - 'cancellations_not_rebooked_pct' - 'obv_not_sent' - 'rx_notes_made_pct'
  - 'answered_calls_pct' - 'diary_management_pct' - 'follow_up_phone_calls_pct'
where role = 'admin';
