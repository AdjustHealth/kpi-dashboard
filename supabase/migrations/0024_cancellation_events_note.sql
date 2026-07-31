-- A staff-written note per cancellation, independent of the CSV-sourced
-- "Note" column (which is Nookal's own note text and gets fully replaced
-- on every re-upload for the week, same reasoning as flagged_for_discussion
-- in migration 0023) — for things like what to actually raise with the
-- admin about this cancellation.
alter table cancellation_events add column if not exists discussion_note text;
