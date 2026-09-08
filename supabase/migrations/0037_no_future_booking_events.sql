-- Nookal's Last Attendances Report lists clients whose most recent booking
-- fell in a given week and who still have no future booking as of when the
-- report was run — catching the case a Cancellations-Report-based "Not
-- Rebooked" list structurally can't: a client who attended a real
-- appointment (no cancellation involved at all — e.g. Abbi Golightly's
-- initial consult with Tayla) and then simply never booked again. There's
-- no cancellation event to hang that off, so it needs its own table rather
-- than folding into cancellation_events.
--
-- Re-uploading a week's report replaces that week's rows entirely
-- (delete-then-insert), same convention as cancellation_events.
create table no_future_booking_events (
  id uuid primary key default gen_random_uuid(),
  week_ending date not null references weekly_kpis(week_ending) on delete cascade,
  client text not null,
  provider text,
  last_booking_date date,
  booking_type text,
  case_name text,
  case_status text,
  not_rebooked_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index no_future_booking_events_week_ending_idx on no_future_booking_events (week_ending);

alter table no_future_booking_events enable row level security;
create policy "authenticated full access" on no_future_booking_events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
