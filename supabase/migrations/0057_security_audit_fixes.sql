-- Fixes two gaps found in a read-only security audit (23/10/26):
--
-- 1. is_director_user() fell back to `true` whenever auth.email() was NULL
--    -- which is exactly the unauthenticated/anon case, not just "a real
--    login with no staff_access row". Every access-control function in this
--    schema (can_access_section, can_access_provider_role) is built on top
--    of this one, so a request with no valid session at all could evaluate
--    as a full director. This only changes behaviour for a caller that
--    ISN'T authenticated -- every real logged-in session (director or
--    staff) keeps exactly the access it already had.
--
-- 2. pre_employment_activity_weekly, no_future_booking_events and the
--    nookal-reports storage bucket were never brought into the granular
--    staff-access scoping done for every other table in 0029/0039 -- they
--    were left on their original "any authenticated user" policy from when
--    they were created, and still hold real client names. Scoped them the
--    same way cancellation_events already is (no_future_booking_events is
--    that table's own direct counterpart) and the same way nookal_uploads/
--    the rest of the Data Entry section already is.

create or replace function is_director_user() returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.role() is distinct from 'authenticated' then false
    else coalesce((select is_director from staff_access where email = auth.email()), true)
  end;
$$;

drop policy "authenticated full access" on pre_employment_activity_weekly;
create policy "data entry scoped" on pre_employment_activity_weekly for all using (
  is_director_user() or can_access_section('data_entry')
) with check (
  is_director_user() or can_access_section('data_entry')
);

drop policy "authenticated full access" on no_future_booking_events;
create policy "read scoped" on no_future_booking_events for select using (
  is_director_user() or exists (select 1 from providers p where p.name = no_future_booking_events.provider and can_access_provider_role(p.role))
);
create policy "update scoped" on no_future_booking_events for update using (
  is_director_user() or exists (select 1 from providers p where p.name = no_future_booking_events.provider and can_access_provider_role(p.role))
) with check (
  is_director_user() or exists (select 1 from providers p where p.name = no_future_booking_events.provider and can_access_provider_role(p.role))
);
create policy "insert scoped" on no_future_booking_events for insert with check (
  is_director_user() or can_access_section('data_entry')
);
create policy "delete scoped" on no_future_booking_events for delete using (
  is_director_user() or can_access_section('data_entry')
);

drop policy "authenticated read nookal-reports" on storage.objects;
drop policy "authenticated upload nookal-reports" on storage.objects;
drop policy "authenticated delete nookal-reports" on storage.objects;
create policy "data entry read nookal-reports" on storage.objects
  for select using (bucket_id = 'nookal-reports' and (is_director_user() or can_access_section('data_entry')));
create policy "data entry upload nookal-reports" on storage.objects
  for insert with check (bucket_id = 'nookal-reports' and (is_director_user() or can_access_section('data_entry')));
create policy "data entry delete nookal-reports" on storage.objects
  for delete using (bucket_id = 'nookal-reports' and (is_director_user() or can_access_section('data_entry')));
