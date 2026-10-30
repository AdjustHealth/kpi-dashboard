-- Follow-up to 0060: adds the single "as of this review" KPI/KPA value
-- (written into the 6mth window slot only) to each imported review's
-- kpi_rollups/kpa_rollups, for the fields that map 1:1 onto this app's
-- CURRENT CLINICIAN_METRIC_FIELDS/CORE_VALUES_KPA_FIELDS with an unchanged
-- definition.
--
-- Deliberately NOT populated:
-- - 1yr/2yr/3yr windows: the old sheet's other columns are either separate
--   past review snapshots (literal years) or inconsistently labelled across
--   tabs, not a trailing window ending at THIS review date the way our
--   6mth/1yr/2yr/3yr windows are -- there's no honest way to map them.
-- - CVA/UCVA/NCVA/TPR/LTVC: the old sheet's numbers used a different
--   calculation than what this app now computes (ucva/ncva were redefined
--   this session) -- importing them under the same field keys would make a
--   misleading trend line comparing two different formulas.
-- - Voxers/LTVC and the compliance Y/N checkboxes (CX Report Completed
--   etc.): not in this app's current KPI schema at all.
-- - The 12-item task KPA list (greet_walk_client, adjust_consultation,
--   etc.): the old sheet split this across two categories with 13 items
--   worded differently; this app's current 12-item list is a later
--   consolidation and doesn't map 1:1 with confidence.
-- - Marcio's "Senior Physio KPAs" section: no equivalent field exists in
--   this app's current senior_physio KPA schema at all.

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":5.9},"occupancy_pct":{"6mth":0.86},"npbr_recommendations":{"6mth":5.6},"new_patients":{"6mth":1.5},"new_pt_booking_rate":{"6mth":3.4},"dnas":{"6mth":0.6},"cancellations":{"6mth":12.4},"not_rebooked":{"6mth":2}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Erin Duthie')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Erin Duthie'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.4},"occupancy_pct":{"6mth":0.83},"npbr_recommendations":{"6mth":12.9},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":6.9},"dnas":{"6mth":1.2},"cancellations":{"6mth":14.8},"not_rebooked":{"6mth":4.3}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Sam Johnston')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Sam Johnston'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.8},"occupancy_pct":{"6mth":0.69},"npbr_recommendations":{"6mth":6.8},"new_patients":{"6mth":1.1},"new_pt_booking_rate":{"6mth":6.6},"dnas":{"6mth":0.3},"cancellations":{"6mth":5.2},"not_rebooked":{"6mth":1}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Lachlan Brazier')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Lachlan Brazier'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":3.6},"occupancy_pct":{"6mth":0.83},"npbr_recommendations":{"6mth":12.3},"new_patients":{"6mth":2.4},"new_pt_booking_rate":{"6mth":4.9},"dnas":{"6mth":1.1},"cancellations":{"6mth":18.1},"not_rebooked":{"6mth":4.3}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Samantha Delohery')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Samantha Delohery'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.6},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":12.3},"new_patients":{"6mth":1.8},"new_pt_booking_rate":{"6mth":7},"dnas":{"6mth":0.9},"cancellations":{"6mth":14},"not_rebooked":{"6mth":3.5}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Wilson Page')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Wilson Page'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":2.6},"occupancy_pct":{"6mth":0.67},"npbr_recommendations":{"6mth":5.8},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":3.1},"dnas":{"6mth":0.4},"cancellations":{"6mth":5.8},"not_rebooked":{"6mth":1.7}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Jake Mitchell')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Jake Mitchell'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":6.6},"occupancy_pct":{"6mth":0.81},"npbr_recommendations":{"6mth":14.2},"new_patients":{"6mth":2.6},"new_pt_booking_rate":{"6mth":5.7},"dnas":{"6mth":1.1},"cancellations":{"6mth":14.9},"not_rebooked":{"6mth":4}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Tayla Cattanach')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Tayla Cattanach'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.5},"occupancy_pct":{"6mth":0.78},"npbr_recommendations":{"6mth":17.8},"new_patients":{"6mth":2.6},"new_pt_booking_rate":{"6mth":7.1},"dnas":{"6mth":1.2},"cancellations":{"6mth":14.3},"not_rebooked":{"6mth":4.5}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Dean Walker')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Dean Walker'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":5.1},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":11.5},"new_patients":{"6mth":2.1},"new_pt_booking_rate":{"6mth":6},"dnas":{"6mth":1.8},"cancellations":{"6mth":17.3},"not_rebooked":{"6mth":4.2}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Ilan Berkowitz')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Ilan Berkowitz'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":8.2},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":14.8},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":7.7},"dnas":{"6mth":1.3},"cancellations":{"6mth":13.9},"not_rebooked":{"6mth":3.9}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Marcio Dos Santos')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Marcio Dos Santos'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":10.6},"occupancy_pct":{"6mth":0.91},"npbr_recommendations":{"6mth":5.1},"new_patients":{"6mth":1.1},"new_pt_booking_rate":{"6mth":4.6},"dnas":{"6mth":1.1},"cancellations":{"6mth":19.1},"not_rebooked":{"6mth":2.6}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Nick Baxter')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Nick Baxter'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":3.6},"occupancy_pct":{"6mth":0.74},"npbr_recommendations":{"6mth":15.2},"new_patients":{"6mth":2.7},"new_pt_booking_rate":{"6mth":5},"dnas":{"6mth":0.2},"cancellations":{"6mth":11.1},"not_rebooked":{"6mth":4.4}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Imogen O''Neill')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Imogen O''Neill'));

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.3},"occupancy_pct":{"6mth":0.67},"npbr_recommendations":{"6mth":15.2},"new_patients":{"6mth":2.4},"new_pt_booking_rate":{"6mth":6.9},"dnas":{"6mth":0.9},"cancellations":{"6mth":8.2},"not_rebooked":{"6mth":3}}'::jsonb, kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Riley Fairhurst')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Riley Fairhurst'));
