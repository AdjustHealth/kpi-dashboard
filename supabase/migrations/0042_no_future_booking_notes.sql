-- getNotRebookedClients (lib/clinicData.ts) merges cancellation_events and
-- no_future_booking_events rows into one Unretained list UI, and that UI's
-- notes textarea/flag star (see components/clinic/CancellationsTable.tsx)
-- were built assuming every row lives in cancellation_events, which already
-- has these two columns (migrations 0023/0024). A row that actually came
-- from no_future_booking_events (the Last Attendances Report source) has no
-- matching id there, so a provider's note or flag on one of those rows
-- silently updated zero rows and was gone on the next page load. Add the
-- same two columns here so both sources can actually hold one.
alter table no_future_booking_events add column if not exists discussion_note text;
alter table no_future_booking_events add column if not exists flagged_for_discussion boolean not null default false;
