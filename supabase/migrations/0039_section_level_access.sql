-- Business-area-level access — independent of both the director/restricted
-- split and the existing per-Meetings-role scoping (allowed_provider_roles).
-- A restricted login can now be granted any combination of Data Entry,
-- Clinic Reports, Meetings, Team, Adjust Gym, Assessment Tool. Configuration
-- (Targets/Settings) is deliberately NOT one of these keys — directors only,
-- full stop, same as clinic_targets' RLS already enforced.
alter table staff_access add column allowed_sections text[] not null default '{}';

create or replace function can_access_section(target_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_director_user()
    or target_section = any(coalesce((select allowed_sections from staff_access where email = auth.email()), '{}'::text[]));
$$;

-- Full "meetings" section access now means every provider role's meeting
-- page (Providers regardless of role, Senior Physio, Admin) — the existing
-- allowed_provider_roles list keeps working underneath this as the more
-- granular option (Marcio: physio/massage/ep only, no full Meetings grant).
create or replace function can_access_provider_role(target_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_director_user()
    or target_role = any(coalesce((select allowed_provider_roles from staff_access where email = auth.email()), '{}'::text[]))
    or can_access_section('meetings');
$$;

create or replace function get_my_access() returns table(is_director boolean, allowed_provider_roles text[], allowed_sections text[])
language sql stable security definer set search_path = public as $$
  select coalesce(sa.is_director, true), coalesce(sa.allowed_provider_roles, '{}'::text[]), coalesce(sa.allowed_sections, '{}'::text[])
  from (select 1) as one_row
  left join staff_access sa on sa.email = auth.email();
$$;

-- ============================================================
-- weekly_kpis — was director-only read. Data Entry (uploads/edits it via
-- the Weekly Input page) and Clinic Reports (views it on Dashboard/clinic
-- pages) are both now legitimate non-director reasons to read it. Writes
-- stay Data Entry (+ director) — Clinic Reports is view-only.
-- ============================================================
drop policy "read director only" on weekly_kpis;
create policy "read scoped" on weekly_kpis for select using (
  can_access_section('data_entry') or can_access_section('clinic_reports')
);
drop policy "update director only" on weekly_kpis;
create policy "update scoped" on weekly_kpis for update using (
  can_access_section('data_entry')
) with check (
  can_access_section('data_entry')
);
-- delete stays director-only, untouched.

-- ============================================================
-- provider_weekly — a Nookal upload writes every provider's week
-- regardless of role, so Data Entry access needs to bypass the existing
-- per-role scoping for insert/update. Reads stay role-scoped as before —
-- Data Entry isn't by itself a reason to read a specific provider's own
-- meeting notes.
-- ============================================================
drop policy "insert scoped" on provider_weekly;
create policy "insert scoped" on provider_weekly for insert with check (
  can_access_section('data_entry')
  or exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
);
drop policy "update scoped" on provider_weekly;
create policy "update scoped" on provider_weekly for update using (
  can_access_section('data_entry')
  or exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
) with check (
  can_access_section('data_entry')
  or exists (select 1 from providers p where p.id = provider_weekly.provider_id and can_access_provider_role(p.role))
);

-- ============================================================
-- cancellation_events — same reasoning: a Nookal upload replaces the whole
-- week's rows across every provider, not just ones the uploader has a
-- Meetings role for.
-- ============================================================
drop policy "insert director only" on cancellation_events;
create policy "insert scoped" on cancellation_events for insert with check (
  can_access_section('data_entry') or is_director_user()
);
drop policy "delete director only" on cancellation_events;
create policy "delete scoped" on cancellation_events for delete using (
  can_access_section('data_entry') or is_director_user()
);

-- ============================================================
-- performance_reviews — Team section.
-- ============================================================
drop policy "director only" on performance_reviews;
create policy "team scoped" on performance_reviews for all using (
  can_access_section('team')
) with check (
  can_access_section('team')
);

-- ============================================================
-- nookal_uploads — the upload history/metadata itself, Data Entry section.
-- ============================================================
drop policy "director only" on nookal_uploads;
create policy "data entry scoped" on nookal_uploads for all using (
  can_access_section('data_entry')
) with check (
  can_access_section('data_entry')
);

-- ============================================================
-- admin_new_client_tasks — tied to the Admin meeting page, so scoped the
-- same way that page now is: the 'admin' provider role (which already
-- includes full Meetings section access via can_access_provider_role above).
-- ============================================================
drop policy "director only" on admin_new_client_tasks;
create policy "admin role scoped" on admin_new_client_tasks for all using (
  can_access_provider_role('admin')
) with check (
  can_access_provider_role('admin')
);

-- clinic_targets is deliberately untouched — Targets/Settings stay
-- Configuration, which only directors ever get, section grants or not.
