-- "vs Last Review" is correct, working code (ReviewDetailView.tsx +
-- getPreviousReview) -- it is being defeated by leftover duplicate rows.
--
-- 0061 wrote each imported provider's KPI/KPA numbers onto whichever
-- completed review had the LATEST review_date, assuming each provider had
-- only one completed review (the Feb 2026 import). For Marcio and Tayla (and
-- possibly others among the 13), an extra completed review existed at that
-- point with a later date and no narrative content of its own -- a stray
-- from troubleshooting, not a real second review cycle. So 0061's numbers
-- landed on the stray instead of the real import, and the real import (which
-- "previous review" correctly points at) stayed empty.
--
-- This repairs every one of the 13 imported providers in one pass, with no
-- need to know which ones are actually affected:
--   1. Finds providers with more than one completed review.
--   2. Among those, finds the one with NO narrative at all (empty
--      goals_reflection/proud_of/areas_for_growth -- i.e. nothing the
--      director ever actually typed into it) -- that's the stray.
--   3. Moves its kpi_rollups/kpa_rollups onto the earliest completed review
--      (the real import).
--   4. Deletes the stray.
-- A later completed review that DOES carry real narrative content is left
-- completely alone -- that's a genuine second review, never touched here.

with completed as (
  select pr.id, pr.provider_id, pr.review_date, pr.kpi_rollups, pr.kpa_rollups,
         coalesce(jsonb_array_length(pr.goals_reflection), 0) = 0
           and pr.proud_of = '{}'::text[]
           and pr.areas_for_growth = '{}'::text[] as is_empty_narrative
  from performance_reviews pr
  where pr.completed_at is not null
),
per_provider as (
  select provider_id from completed group by provider_id having count(*) > 1
),
earliest as (
  select distinct on (c.provider_id) c.id, c.provider_id
  from completed c join per_provider p on p.provider_id = c.provider_id
  order by c.provider_id, c.review_date asc, c.id asc
),
stray as (
  select distinct on (c.provider_id) c.id, c.provider_id, c.kpi_rollups, c.kpa_rollups
  from completed c join per_provider p on p.provider_id = c.provider_id
  where c.is_empty_narrative
  order by c.provider_id, c.review_date desc, c.id desc
)
update performance_reviews pr
set kpi_rollups = s.kpi_rollups, kpa_rollups = s.kpa_rollups
from earliest e join stray s on s.provider_id = e.provider_id
where pr.id = e.id;

with completed as (
  select pr.id, pr.provider_id, pr.review_date,
         coalesce(jsonb_array_length(pr.goals_reflection), 0) = 0
           and pr.proud_of = '{}'::text[]
           and pr.areas_for_growth = '{}'::text[] as is_empty_narrative
  from performance_reviews pr
  where pr.completed_at is not null
),
per_provider as (
  select provider_id from completed group by provider_id having count(*) > 1
),
stray as (
  select distinct on (c.provider_id) c.id
  from completed c join per_provider p on p.provider_id = c.provider_id
  where c.is_empty_narrative
  order by c.provider_id, c.review_date desc, c.id desc
)
delete from performance_reviews where id in (select id from stray);
