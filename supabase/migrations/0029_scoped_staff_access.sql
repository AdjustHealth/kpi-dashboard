-- Restricted staff logins — the first real access-control layer in this
-- app. Until now every login was a full director login (every RLS policy
-- was just "authenticated = full access", see 0001_init.sql's own comment
-- explaining that was fine because only directors had accounts). Marcio
-- (a senior physio) now needs his own login for the accountability
-- meetings he runs with standard providers (physio/massage/ep) — but not
-- senior physio or admin pages, and not clinic-wide Revenue/Targets/etc.
--
-- No row in staff_access = an existing/unlisted account = still a full
-- director, so nothing needs backfilling for current logins.
create table staff_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_director boolean not null default false,
  -- Only relevant when is_director = false. Matches providers.role values
  -- ('physio','massage','ep','senior_physio','admin') — e.g. Marcio starts
  -- as {physio,massage,ep}; widening his access later (director said "I
  -- may increase his access later") is just editing this array, no code
  -- change needed.
  allowed_provider_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table staff_access enable row level security;
-- Deliberately no direct-select policy — nobody reads this table straight
-- from the client. The SECURITY DEFINER functions below read it on the
-- app's behalf; get_my_access() is how the app itself asks "what am I
-- allowed to see" for nav/redirect purposes.
create trigger staff_access_set_updated_at before update on staff_access
  for each row execute function set_updated_at();

create or replace function is_director_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_director from staff_access where email = auth.email()), true);
$$;

create or replace function can_access_provider_role(target_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_director_user()
    or target_role = any(coalesce((select allowed_provider_roles from staff_access where email = auth.email()), '{}'::text[]));
$$;

-- Callable by any authenticated user to read their own effective access —
-- always returns exactly one row (director defaults) even with no
-- staff_access row, via the left join.
create or replace function get_my_access() returns table(is_director boolean, allowed_provider_roles text[])
language sql stable security definer set search_path = public as $$
  select coalesce(sa.is_director, true), coalesce(sa.allowed_provider_roles, '{}'::text[])
  from (select 1) as one_row
  left join staff_access sa on sa.email = auth.email();
$$;

-- ============================================================
-- providers — read/update scoped by role; only directors add/remove
-- provider records or touch targets/specialty_metrics/sort_order (those
-- go through the same table but Marcio's UI never exposes them — see the
-- app-level guards for the rest of that boundary).
-- ============================================================
drop policy "authenticated full access" on providers;
create policy "read scoped by role" on providers for select using (can_access_provider_role(role));
create policy "insert director only" on providers for insert with check (is_director_user());
create policy "update scoped by role" on providers for update using (can_access_provider_role(role)) with check (can_access_provider_role(role));
create policy "delete director only" on providers for delete using (is_director_user());

-- ============================================================
-- provider_weekly — same role-scoping, joined via provider_id. This is
-- where Meeting Notes/Action Steps/KPI Scorecard/KPA ratings/Goals for an
-- accessible provider actually live, so Marcio needs real write access
-- here, not just read.
-- ============================================================
drop policy "authenticated full access" on provider_weekly;
create policy "read scoped" on provider_weekly for select using (
  exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
);
create policy "insert scoped" on provider_weekly for insert with check (
  exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
);
create policy "update scoped" on provider_weekly for update using (
  exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
) with check (
  exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
);
create policy "delete director only" on provider_weekly for delete using (is_director_user());

-- ============================================================
-- weekly_kpis — clinic-wide financials/targets, no standard provider page
-- reads this. Locked to directors, except INSERT stays open to any
-- authenticated user: /api/provider-weekly and /api/action-steps both
-- upsert a placeholder {week_ending} row here first (FK guard) before
-- saving provider_weekly, which would otherwise break for Marcio.
-- ============================================================
drop policy "authenticated full access" on weekly_kpis;
create policy "insert any authenticated" on weekly_kpis for insert with check (auth.role() = 'authenticated');
create policy "read director only" on weekly_kpis for select using (is_director_user());
create policy "update director only" on weekly_kpis for update using (is_director_user()) with check (is_director_user());
create policy "delete director only" on weekly_kpis for delete using (is_director_user());

-- ============================================================
-- cancellation_events — Marcio needs to see (and resolve/flag) his
-- accessible providers' own cancellations, same as a director viewing
-- that provider's page. Bulk insert/delete only ever happens from the
-- Nookal upload pipeline (director-only action already).
-- ============================================================
drop policy "authenticated full access" on cancellation_events;
create policy "read scoped" on cancellation_events for select using (
  is_director_user() or exists (select 1 from providers p where p.name = cancellation_events.provider and can_access_provider_role(p.role))
);
create policy "update scoped" on cancellation_events for update using (
  is_director_user() or exists (select 1 from providers p where p.name = cancellation_events.provider and can_access_provider_role(p.role))
) with check (
  is_director_user() or exists (select 1 from providers p where p.name = cancellation_events.provider and can_access_provider_role(p.role))
);
create policy "insert director only" on cancellation_events for insert with check (is_director_user());
create policy "delete director only" on cancellation_events for delete using (is_director_user());

-- ============================================================
-- role_targets — read is low-sensitivity (goal numbers, not actuals) and
-- a standard provider's page needs to read the "providers" group's
-- targets to show on-track/off-track colouring, so left open to any
-- authenticated user; only directors edit target values.
-- ============================================================
drop policy "authenticated full access" on role_targets;
create policy "read any authenticated" on role_targets for select using (auth.role() = 'authenticated');
create policy "insert director only" on role_targets for insert with check (is_director_user());
create policy "update director only" on role_targets for update using (is_director_user()) with check (is_director_user());
create policy "delete director only" on role_targets for delete using (is_director_user());

-- ============================================================
-- Everything else touched by a standard provider's meeting page never —
-- clinic-wide financial targets, report uploads, performance reviews,
-- the admin new-client checklist. Director only, full stop, until the
-- director says otherwise.
-- ============================================================
drop policy "authenticated full access" on clinic_targets;
create policy "director only" on clinic_targets for all using (is_director_user()) with check (is_director_user());

drop policy "authenticated full access" on nookal_uploads;
create policy "director only" on nookal_uploads for all using (is_director_user()) with check (is_director_user());

drop policy "authenticated full access" on performance_reviews;
create policy "director only" on performance_reviews for all using (is_director_user()) with check (is_director_user());

drop policy "authenticated full access" on admin_new_client_tasks;
create policy "director only" on admin_new_client_tasks for all using (is_director_user()) with check (is_director_user());
