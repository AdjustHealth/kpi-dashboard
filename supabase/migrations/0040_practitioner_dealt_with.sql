-- Lets a practitioner tick their own cancellation/follow-up rows as dealt
-- with on their own My Dashboard cancellations tab. Deliberately separate
-- from the director's own flagged_for_discussion/discussion_note (meeting
-- prep) and not_rebooked_resolved (a dismiss that removes the row from the
-- Unretained list) — this is the practitioner's own tick, and per the
-- director's request it must NOT hide the row: ticking it just marks the
-- row done (struck through) for the rest of that week, so nothing gets
-- silently dropped or double-handled. Same delete-then-insert-per-week
-- upload convention as every other flag on these tables, so a re-upload of
-- the week's report resets it along with everything else CSV-sourced.
alter table cancellation_events add column if not exists dealt_with boolean not null default false;
alter table no_future_booking_events add column if not exists dealt_with boolean not null default false;
