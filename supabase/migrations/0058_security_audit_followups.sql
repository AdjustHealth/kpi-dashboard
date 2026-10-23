-- Two more fixes from the 23/10/26 security audit (High findings this time,
-- not the Critical ones already fixed in 0057).
--
-- 1. providers' RLS update policy (can_access_provider_role(role)) covers
--    the whole row for anyone with that role tier's access, not just
--    directors -- including targets/specialty_metrics/sort_order/name/
--    role/active, which the app's own UI never exposes to a non-director
--    (see 0039's own comment acknowledging this as a UI-only guard, not a
--    DB one). RLS has no native column-level restriction when every login
--    shares one Postgres role, so this is enforced with a trigger instead.
--    `goals` is deliberately left out -- GoalsCard is a real, legitimate
--    non-director write path (e.g. Marcio updating a standard physio's
--    goals during their meeting), confirmed against app/api/providers/
--    route.ts PATCH.
--
-- 2. performance_reviews' single "team scoped" policy allowed full CRUD,
--    including delete, to anyone with the Team section grant. Every other
--    table in this schema restricts delete to directors specifically
--    (providers, provider_weekly, cancellation_events, etc.) -- this one
--    was the exception, not an intentional design choice anywhere in its
--    own migration's comments.

create or replace function restrict_providers_director_only_columns() returns trigger
language plpgsql as $$
begin
  if not is_director_user() then
    if new.name is distinct from old.name
      or new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.targets is distinct from old.targets
      or new.specialty_metrics is distinct from old.specialty_metrics
      or new.sort_order is distinct from old.sort_order
    then
      raise exception 'Only a director can change name, role, active, targets, specialty_metrics or sort_order on a provider';
    end if;
  end if;
  return new;
end;
$$;

create trigger providers_restrict_director_only_columns
  before update on providers
  for each row execute function restrict_providers_director_only_columns();

drop policy "team scoped" on performance_reviews;
create policy "read scoped" on performance_reviews for select using (
  can_access_section('team')
);
create policy "insert scoped" on performance_reviews for insert with check (
  can_access_section('team')
);
create policy "update scoped" on performance_reviews for update using (
  can_access_section('team')
) with check (
  can_access_section('team')
);
create policy "delete director only" on performance_reviews for delete using (
  is_director_user()
);
