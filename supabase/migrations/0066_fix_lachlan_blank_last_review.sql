-- Lachlan Brazier's "vs Last Review" was blank -- not the Marcio/Tayla
-- duplicate-row bug (0063) and not the stray-draft bug (0064), both of
-- which only fire when a provider has more than one completed review.
-- Lachlan has exactly one completed review (review_date 2026-02-11), and
-- it genuinely has empty kpi_rollups/kpa_rollups ('{}') -- so
-- getPreviousReview() correctly finds it, but there's nothing in it to
-- diff against.
--
-- 0061 already intended real numbers for this exact review (same literal
-- values as its Lachlan Brazier block) -- they just never landed on the
-- live row, almost certainly because a stray duplicate with a later
-- review_date existed at the time 0061 ran and absorbed the update
-- instead (0061 targets review_date = max(review_date)), and that stray
-- was since removed without 0063's "move rollups across first" step
-- (0063 only handles providers who still have >1 completed review today).
--
-- Re-applies 0061's intended values, restricted to this one review and
-- only if it's still empty, so this is a no-op if it's ever re-run or if
-- the row has since been fixed another way.
update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.8},"occupancy_pct":{"6mth":0.69},"npbr_recommendations":{"6mth":6.8},"new_patients":{"6mth":1.1},"new_pt_booking_rate":{"6mth":6.6},"dnas":{"6mth":0.3},"cancellations":{"6mth":5.2},"not_rebooked":{"6mth":1}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Lachlan Brazier')
  and completed_at is not null
  and kpi_rollups = '{}'::jsonb
  and kpa_rollups = '{}'::jsonb;
