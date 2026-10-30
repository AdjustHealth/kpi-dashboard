-- Real root cause (confirmed by direct query on Marcio, 30/10/26): 0061's
-- UPDATE matched each provider's row by `review_date = max(review_date)`,
-- assuming only the Feb 2026 import existed. For providers with an active
-- DRAFT (completed_at null, review_date = today) at the time 0061 ran, that
-- draft's review_date is later than the Feb import's, so 0061's numbers
-- landed on the draft instead -- leaving the real completed review (which
-- getPreviousReview correctly finds as "the previous review") with
-- kpi_rollups/kpa_rollups still '{}'.
--
-- 0063 didn't catch this because it only looked at completed_at is not
-- null rows -- the stray here is a draft, not a second completed review.
--
-- For each of the 13 imported providers: finds the completed review that's
-- still missing its rollups, finds the OTHER row (any completed_at state)
-- that has the rollups but no narrative content (nothing the director
-- actually typed in -- the telltale sign 0061's numbers landed there by
-- date coincidence, not because it's a real second review), copies the
-- rollups across, and blanks them back out on that other row if it's a
-- draft (so a draft being actively worked shows blank rather than stale
-- Feb numbers until its own "Refresh Numbers" is clicked).

with target as (
  select pr.id, pr.provider_id
  from performance_reviews pr
  where pr.completed_at is not null
    and pr.kpi_rollups = '{}'::jsonb
    and pr.provider_id in (
      select id from providers where name in (
        'Erin Duthie','Sam Johnston','Lachlan Brazier','Samantha Delohery','Wilson Page',
        'Jake Mitchell','Tayla Cattanach','Dean Walker','Ilan Berkowitz','Marcio Dos Santos',
        'Nick Baxter','Imogen O''Neill','Riley Fairhurst'
      )
    )
),
source as (
  select distinct on (pr.provider_id) pr.id, pr.provider_id, pr.kpi_rollups, pr.kpa_rollups, pr.completed_at
  from performance_reviews pr
  join target t on t.provider_id = pr.provider_id
  where pr.id <> t.id
    and pr.kpi_rollups <> '{}'::jsonb
    and coalesce(jsonb_array_length(pr.goals_reflection), 0) = 0
    and pr.proud_of = '{}'::text[]
    and pr.areas_for_growth = '{}'::text[]
  order by pr.provider_id, pr.review_date desc
),
copy_to_target as (
  update performance_reviews pr
  set kpi_rollups = s.kpi_rollups, kpa_rollups = s.kpa_rollups
  from target t join source s on s.provider_id = t.provider_id
  where pr.id = t.id
  returning pr.id
),
reset_draft_source as (
  update performance_reviews pr
  set kpi_rollups = '{}'::jsonb, kpa_rollups = '{}'::jsonb
  from source s
  where pr.id = s.id and s.completed_at is null
  returning pr.id
)
select (select count(*) from copy_to_target) as rows_fixed,
       (select count(*) from reset_draft_source) as drafts_reset;
