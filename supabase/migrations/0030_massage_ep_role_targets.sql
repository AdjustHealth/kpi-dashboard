-- Massage and EP each get their own optional role_targets group so the
-- director can override a specific shared clinician target (e.g. Completed
-- Consults) for just that role — see lib/targetsSchema.ts's
-- ROLE_TARGET_GROUPS and lib/defaultTargets.ts's getEffectiveTargets, which
-- layers the massage/ep group on top of "providers" rather than replacing
-- it, so an untouched massage/ep group still inherits every Providers value.
--
-- Widen the id check constraint (dynamically, since Postgres's
-- auto-generated constraint name isn't guaranteed) instead of assuming its
-- name, then seed empty rows so the Targets page always finds them.
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'role_targets' and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%providers%senior%admin%';
  if cname is not null then
    execute format('alter table role_targets drop constraint %I', cname);
  end if;
end $$;

alter table role_targets add constraint role_targets_id_check
  check (id in ('providers', 'massage', 'ep', 'senior', 'admin'));

insert into role_targets (id, values) values
  ('massage', '{}'::jsonb),
  ('ep', '{}'::jsonb)
on conflict (id) do nothing;
