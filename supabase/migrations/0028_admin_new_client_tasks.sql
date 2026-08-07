-- Replaces Dayle's manual new-client spreadsheet (Client / Provider /
-- ONLINE / OBV / FU calls columns) with one row per new client per week,
-- auto-populated from each clinician's provider_weekly.metrics.new_patient_
-- names (already excludes pre-employment — see lib/nookal/parsers.ts).
-- Dayle just ticks Online Booking / Onboarding Video Sent / Follow Up Call
-- per client on the Weekly Input page; the % is computed automatically and
-- written into weekly_kpis (see app/api/admin-client-tasks/route.ts)
-- instead of being hand-typed and re-summed every week.
--
-- OBV is "Onboarding Video" — the same task as Onboarding Video Sent, not
-- a separate thing (director clarified; an earlier pass here briefly
-- treated it as its own column, which was wrong). So there's no separate
-- obv_sent column — onboarding_video_sent covers it.
create table admin_new_client_tasks (
  id uuid primary key default gen_random_uuid(),
  week_ending date not null,
  provider_id uuid not null references providers(id) on delete cascade,
  client_name text not null,
  online_booking boolean,
  onboarding_video_sent boolean,
  followup_call_made boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_ending, provider_id, client_name)
);

create index admin_new_client_tasks_week_idx on admin_new_client_tasks (week_ending);

alter table admin_new_client_tasks enable row level security;
create policy "authenticated full access" on admin_new_client_tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create trigger admin_new_client_tasks_set_updated_at before update on admin_new_client_tasks
  for each row execute function set_updated_at();

-- online_bookings_total/online_bookings_new (0001_init.sql) become
-- auto-written counts instead of manual entry (see the API route above) —
-- still tracked (feeds the Clinic Health online-vs-other chart and
-- Quarterly Review) even though it isn't shown on the admin meeting sheet
-- itself. Derived % added the same way diary_mgmt_pct already works.
alter table weekly_kpis add column if not exists online_bookings_pct numeric generated always as (
  case when online_bookings_total > 0
    then online_bookings_new::numeric / online_bookings_total
    else null
  end
) stored;
