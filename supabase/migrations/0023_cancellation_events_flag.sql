-- Lets staff flag a specific cancellation/DNA row to raise in the meeting
-- with the admin who handled it — independent of the CSV-sourced columns,
-- which get fully replaced on every re-upload for the week (see
-- applyReport.ts). This flag is its own column so it survives anything
-- except the row itself being deleted by a re-upload.
alter table cancellation_events add column if not exists flagged_for_discussion boolean not null default false;
