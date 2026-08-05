-- Lets a provider/senior physio dismiss a client from their "Not Rebooked —
-- No Future Booking" meeting list once it's been followed up on, without
-- deleting the row itself (it's the same row the main Cancellations tab
-- shows, and clinic-wide stats were already computed from it at upload
-- time) — a soft resolve, same pattern as flagged_for_discussion. Any new
-- cancellation for that client later gets its own fresh row and shows up
-- again untouched.
alter table cancellation_events add column if not exists not_rebooked_resolved boolean not null default false;
