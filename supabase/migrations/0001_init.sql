-- Adjust Health OS — initial schema
-- Field names here mirror lib/schema.ts (clinic-wide) and lib/providerSchema.ts (per-provider).
-- Keep those files and this migration in sync when adding fields.

create extension if not exists pgcrypto;

-- ============================================================
-- Clinic-wide weekly data (Weekly Input page)
-- ============================================================
create table weekly_kpis (
  week_ending date primary key,

  -- Revenue / activity — currently manual entry (read off Nookal reports by
  -- staff); will become auto-calculated once Nookal report parsing ships.
  total_rev numeric,
  total_consults int,
  total_nc int,
  clinic_occ numeric,
  physio_occ numeric,
  massage_occ numeric,
  ep_occ numeric,

  -- Gym (manual)
  m_glofox numeric,
  m_glofox_fees numeric,
  m_gym3p numeric,
  m_mscred numeric,
  gym_total numeric generated always as (
    coalesce(m_glofox, 0) + coalesce(m_gym3p, 0) + coalesce(m_mscred, 0)
  ) stored,
  m_mems int,

  -- Podiatry (manual)
  m_pod_rev numeric,
  m_pod_c int,
  m_pod_ytd numeric,

  total_adjust_pod_rev numeric generated always as (
    coalesce(total_rev, 0) + coalesce(m_pod_rev, 0)
  ) stored,

  -- CX / cancellations — manual until Nookal cancellations report parsing ships
  cx_cancels int,
  cx_pct numeric,
  cx_dnas int,
  cx_nr int,
  cx_nr_pct numeric,
  cx_rsx_pct numeric,
  cx_in7_pct numeric,

  -- Diary management (manual)
  bookings_start_week int,
  bookings_following_week int,
  diary_mgmt_pct numeric generated always as (
    case when bookings_following_week > 0
      then bookings_start_week::numeric / bookings_following_week
      else null
    end
  ) stored,
  online_bookings_total int,
  online_bookings_new int,

  -- Shared clinic data (from the senior-physio meeting spreadsheet)
  cva_new_grads numeric,
  cva_2_5yr numeric,
  cva_ep numeric,
  cva_massage numeric,
  jbv_initial int,
  jbv_sub int,
  jbv_total int generated always as (
    coalesce(jbv_initial, 0) + coalesce(jbv_sub, 0)
  ) stored,

  -- Admin manual fields
  admin_followup_calls int,
  admin_onboarding_video_pct numeric,
  admin_email_optin_pct numeric,
  admin_website_optin_pct numeric,
  admin_new_client_emails int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Providers (senior physios, physios, massage, EP, admin staff)
-- ============================================================
create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('senior_physio', 'physio', 'massage', 'ep', 'admin')),
  active boolean not null default true,
  sort_order int not null default 0,

  -- Provider-defined extra KPIs, e.g. Sam Johnson:
  --   [{"key":"memberships","label":"Memberships","type":"number"},
  --    {"key":"programming_pct","label":"Programming %","type":"percent"}]
  -- or Marcio dos Santos:
  --   [{"key":"headache_init","label":"Headache Init","type":"number"},
  --    {"key":"headache_sub","label":"Headache Sub","type":"number"}]
  -- Values are stored under the same keys in provider_weekly.metrics.
  specialty_metrics jsonb not null default '[]',

  -- CVA target, annual turnover target, bonus tier thresholds (T1-T4), JBV
  -- target %, etc. Edited on the Targets page. Shape is intentionally loose
  -- since target composition differs by role/seniority.
  targets jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Per-provider weekly record: numbers + checklists + meeting notes
-- ============================================================
create table provider_weekly (
  provider_id uuid not null references providers(id) on delete cascade,
  week_ending date not null references weekly_kpis(week_ending) on delete cascade,

  -- Values keyed by lib/providerSchema.ts field keys, plus this provider's
  -- specialty_metrics keys.
  metrics jsonb not null default '{}',

  -- Compliance checklist + systems/KPA review, keyed by
  -- lib/providerSchema.ts COMPLIANCE_FIELDS / SYSTEMS_KPA_FIELDS keys.
  kpas jsonb not null default '{}',

  -- { agenda_items, review_previous_actions, wins: string[3],
  --   improvements: string[3], multi_disc_utilisation: {hydro,massage,ep,gym} }
  meeting_notes jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (provider_id, week_ending)
);

create index provider_weekly_week_idx on provider_weekly (week_ending);

-- ============================================================
-- Clinic-wide targets (Targets page, "Clinic Targets" section)
-- ============================================================
create table clinic_targets (
  id text primary key default 'clinic' check (id = 'clinic'),
  values jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into clinic_targets (id) values ('clinic');

-- ============================================================
-- Nookal report uploads (Weekly Input page) — file storage reference only;
-- parsing into structured fields is a later phase.
-- ============================================================
create table nookal_uploads (
  id uuid primary key default gen_random_uuid(),
  week_ending date not null references weekly_kpis(week_ending) on delete cascade,
  report_type text not null check (report_type in (
    'activity', 'business_performance', 'occupancy',
    'clients_and_cases', 'cancellations', 'aged_debtors'
  )),
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index nookal_uploads_week_idx on nookal_uploads (week_ending);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger weekly_kpis_set_updated_at before update on weekly_kpis
  for each row execute function set_updated_at();
create trigger providers_set_updated_at before update on providers
  for each row execute function set_updated_at();
create trigger provider_weekly_set_updated_at before update on provider_weekly
  for each row execute function set_updated_at();
create trigger clinic_targets_set_updated_at before update on clinic_targets
  for each row execute function set_updated_at();

-- ============================================================
-- Storage bucket for uploaded Nookal reports
-- ============================================================
insert into storage.buckets (id, name, public)
values ('nookal-reports', 'nookal-reports', false)
on conflict (id) do nothing;

create policy "authenticated read nookal-reports" on storage.objects
  for select using (bucket_id = 'nookal-reports' and auth.role() = 'authenticated');
create policy "authenticated upload nookal-reports" on storage.objects
  for insert with check (bucket_id = 'nookal-reports' and auth.role() = 'authenticated');
create policy "authenticated delete nookal-reports" on storage.objects
  for delete using (bucket_id = 'nookal-reports' and auth.role() = 'authenticated');

-- ============================================================
-- Row Level Security — this app is director-only; any authenticated
-- Supabase user (all accounts are manually invited directors) gets full
-- access. No public/anon access.
-- ============================================================
alter table weekly_kpis enable row level security;
alter table providers enable row level security;
alter table provider_weekly enable row level security;
alter table clinic_targets enable row level security;
alter table nookal_uploads enable row level security;

create policy "authenticated full access" on weekly_kpis
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on providers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on provider_weekly
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on clinic_targets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on nookal_uploads
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Seed: Sam Johnson and Marcio dos Santos, the current senior physios
-- ============================================================
insert into providers (name, role, specialty_metrics, targets, sort_order) values
  (
    'Sam Johnson', 'senior_physio',
    '[
      {"key":"memberships","label":"Memberships","type":"number"},
      {"key":"programming_pct","label":"Programming %","type":"percent"}
    ]'::jsonb,
    '{
      "personal_cva": 7.00,
      "annual_turnover_target": 200000,
      "working_weeks": 48,
      "bonus_tiers": {"t1": 75, "t2": 80, "t3": 90, "t4": 100},
      "programming_pct": 0.25,
      "reel_weekly": true,
      "blog_rolling": 1
    }'::jsonb,
    1
  ),
  (
    'Marcio dos Santos', 'senior_physio',
    '[
      {"key":"headache_init","label":"Headache Init","type":"number"},
      {"key":"headache_sub","label":"Headache Sub","type":"number"},
      {"key":"headache_total","label":"Headache Total","type":"number","source":"calc"}
    ]'::jsonb,
    '{
      "personal_cva": 7.00,
      "annual_turnover_target": 200000,
      "working_weeks": 48,
      "bonus_tiers": {"t1": 20, "t2": 25, "t3": 30, "t4": 35},
      "headache_total": 20,
      "reel_weekly": true,
      "blog_rolling": 1
    }'::jsonb,
    2
  );
