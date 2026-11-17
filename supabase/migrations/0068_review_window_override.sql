-- Lets the director manually pick 6 Month vs 1 Year on a specific review,
-- overriding the auto-detected default from reviewCadenceMonths(provider)
-- -- a provider's actual review cadence can change over time (e.g. a new
-- grad becoming senior, or a one-off exception), and the auto rule alone
-- can't account for that. null means "use the auto default", same as
-- today's behaviour.
alter table performance_reviews
  add column if not exists window_override text
    check (window_override is null or window_override in ('6mth', '1yr'));
