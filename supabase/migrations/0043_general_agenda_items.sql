-- A single "General" agenda box shared by every provider's meeting for a
-- given week — filled in once (clinic-wide items that apply to everyone)
-- instead of being retyped into each person's own Meeting Notes. Distinct
-- from each provider's own agenda_items ("Individual") in
-- provider_weekly.meeting_notes — see components/provider/MeetingNotesCard.tsx.
create table general_agenda_items (
  week_ending date primary key references weekly_kpis(week_ending) on delete cascade,
  text text not null default '',
  updated_at timestamptz not null default now()
);

create trigger general_agenda_items_set_updated_at before update on general_agenda_items
  for each row execute function set_updated_at();

alter table general_agenda_items enable row level security;

-- Anyone who has a meeting page to view at all should see/edit the box
-- that's shown on it — full Meetings section access, a director, or at
-- least one specific provider role grant (e.g. Marcio: physio/massage/ep
-- only, no full Meetings grant).
create or replace function can_access_any_meetings() returns boolean
language sql stable security definer set search_path = public as $$
  select is_director_user()
    or can_access_section('meetings')
    or coalesce(array_length((select allowed_provider_roles from staff_access where email = auth.email()), 1), 0) > 0;
$$;

create policy "meetings scoped" on general_agenda_items for all using (can_access_any_meetings()) with check (can_access_any_meetings());
