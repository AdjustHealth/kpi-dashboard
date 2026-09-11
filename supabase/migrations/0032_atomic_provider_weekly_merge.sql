-- Fixes: two people saving Meeting Notes (or the KPI Scorecard, Action
-- Steps, checklist — anything on a provider page) around the same time
-- could silently lose one of their edits, or wipe a field that was already
-- filled in.
--
-- Root cause: /api/provider-weekly's PATCH handler did SELECT the current
-- section, merge the incoming patch into it in JavaScript, then UPSERT the
-- whole merged object back — three separate round trips with a gap between
-- the read and the write. If two saves land in that gap, both start from
-- the same "before" snapshot; whichever writes last overwrites the other's
-- change, since it never re-reads what the other person just committed.
-- /api/action-steps' "carry over" endpoint had the same shape of bug for
-- meeting_notes.action_steps / action_plan[category].
--
-- Fix: do the read-merge-write as a single atomic statement inside
-- Postgres instead of three round trips from the app. `INSERT ... ON
-- CONFLICT DO UPDATE SET col = col || patch` computes the new value from
-- the row's live value under the row's own lock, so two concurrent saves
-- serialize instead of racing — whichever runs second merges on top of
-- whatever the first one just committed, and nothing is lost.
--
-- These are SECURITY DEFINER (same trick as ensure_weekly_kpis_row in
-- 0031) so they don't need the caller to have direct table access, but
-- each replicates the "update scoped" RLS check from provider_weekly
-- (0029) by hand before touching anything, so a scoped staff login still
-- can't write to a provider outside their allowed_provider_roles.

create or replace function ensure_provider_weekly_write_access(p_provider_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  select role into v_role from providers where id = p_provider_id;
  if v_role is null then
    raise exception 'provider not found';
  end if;
  if not can_access_provider_role(v_role) then
    raise exception 'not authorized for this provider' using errcode = '42501';
  end if;
end;
$$;

-- Replaces the SELECT + upsert in app/api/provider-weekly/route.ts's PATCH
-- handler. p_section is one of metrics/kpas/meeting_notes (validated in the
-- route already, re-checked here since this function is reachable directly
-- via PostgREST); p_patch is shallow-merged into that section's existing
-- jsonb, same semantics as the old `{ ...existingSection, ...patch }`.
create or replace function merge_provider_weekly_section(
  p_provider_id uuid,
  p_week_ending date,
  p_section text,
  p_patch jsonb
) returns provider_weekly
language plpgsql security definer set search_path = public as $$
declare
  result provider_weekly;
begin
  if p_section not in ('metrics', 'kpas', 'meeting_notes') then
    raise exception 'invalid section: %', p_section;
  end if;
  perform ensure_provider_weekly_write_access(p_provider_id);

  insert into provider_weekly (provider_id, week_ending, metrics, kpas, meeting_notes)
  values (
    p_provider_id, p_week_ending,
    case when p_section = 'metrics' then p_patch else '{}'::jsonb end,
    case when p_section = 'kpas' then p_patch else '{}'::jsonb end,
    case when p_section = 'meeting_notes' then p_patch else '{}'::jsonb end
  )
  on conflict (provider_id, week_ending) do update set
    metrics = case when p_section = 'metrics'
      then coalesce(provider_weekly.metrics, '{}'::jsonb) || p_patch else provider_weekly.metrics end,
    kpas = case when p_section = 'kpas'
      then coalesce(provider_weekly.kpas, '{}'::jsonb) || p_patch else provider_weekly.kpas end,
    meeting_notes = case when p_section = 'meeting_notes'
      then coalesce(provider_weekly.meeting_notes, '{}'::jsonb) || p_patch else provider_weekly.meeting_notes end
  returning * into result;

  return result;
end;
$$;

grant execute on function merge_provider_weekly_section(uuid, date, text, jsonb) to authenticated;

-- Replaces the SELECT + upsert in app/api/action-steps/route.ts's carry-over
-- POST handler. Appends p_item onto meeting_notes.action_steps (p_field =
-- 'action_steps') or meeting_notes.action_plan[p_category] (p_field =
-- 'action_plan'), atomically. Older weeks can have that target stored as a
-- plain jsonb string instead of an array (see lib/actionItems.ts) — the
-- typeof checks below wrap a lone string into a one-element array instead
-- of erroring on `string || array`, matching normalizeActionItems' leniency.
create or replace function append_provider_weekly_action_item(
  p_provider_id uuid,
  p_week_ending date,
  p_field text,
  p_category text,
  p_item jsonb
) returns provider_weekly
language plpgsql security definer set search_path = public as $$
declare
  result provider_weekly;
  v_path text[];
begin
  if p_field not in ('action_steps', 'action_plan') then
    raise exception 'invalid field: %', p_field;
  end if;
  if p_field = 'action_plan' and (p_category is null or p_category = '') then
    raise exception 'category is required for action_plan';
  end if;
  perform ensure_provider_weekly_write_access(p_provider_id);

  v_path := case when p_field = 'action_steps' then array['action_steps'] else array['action_plan', p_category] end;

  insert into provider_weekly (provider_id, week_ending, meeting_notes)
  values (p_provider_id, p_week_ending, jsonb_set('{}'::jsonb, v_path, jsonb_build_array(p_item), true))
  on conflict (provider_id, week_ending) do update set
    meeting_notes = jsonb_set(
      coalesce(provider_weekly.meeting_notes, '{}'::jsonb),
      v_path,
      (case jsonb_typeof(provider_weekly.meeting_notes #> v_path)
        when 'array' then provider_weekly.meeting_notes #> v_path
        when 'string' then jsonb_build_array(provider_weekly.meeting_notes #> v_path)
        else '[]'::jsonb
      end) || jsonb_build_array(p_item),
      true
    )
  returning * into result;

  return result;
end;
$$;

grant execute on function append_provider_weekly_action_item(uuid, date, text, text, jsonb) to authenticated;
