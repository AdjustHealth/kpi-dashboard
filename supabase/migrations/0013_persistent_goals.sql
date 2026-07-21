-- Performance Review Goals used to be a per-week boolean checkbox with no
-- way to actually write down what the goal was — the director wants to type
-- the goal once and have it (and whether it's been achieved) stay exactly
-- as-is every week until she changes it, not reset week to week. That's
-- provider-level state, not something scoped to week_ending, so it lives on
-- providers rather than provider_weekly. "Achieved" only clears at the next
-- performance review (a future feature) — not automatically, and not weekly.
alter table providers
  add column if not exists goals jsonb not null default '[
    {"text": "", "achieved": false},
    {"text": "", "achieved": false},
    {"text": "", "achieved": false}
  ]'::jsonb;
