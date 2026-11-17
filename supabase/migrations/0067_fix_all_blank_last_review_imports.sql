-- Dean Walker turned up with the exact same bug as Lachlan Brazier
-- (0066): a completed review with empty kpi_rollups/kpa_rollups, making
-- "vs Last Review" blank even though a prior completed review genuinely
-- exists. Rather than fix these one provider at a time as each is
-- spotted, this restores EVERY one of the 13 originally-imported
-- providers' intended 0061 numbers, each guarded to only touch a review
-- that is still completed and still empty -- so this is a safe no-op for
-- anyone (like Erin Duthie, Sam Johnston, and now Lachlan Brazier via
-- 0066) whose import already landed correctly, and silently repairs
-- anyone else sitting in the same broken state who just hasn't been
-- noticed yet.
--
-- Marcio Dos Santos additionally gets his "core_values" KPA key merged
-- back in (see 0062) alongside the 7 individual keys, since his senior
-- review page reads core_values specifically.

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":5.9},"occupancy_pct":{"6mth":0.86},"npbr_recommendations":{"6mth":5.6},"new_patients":{"6mth":1.5},"new_pt_booking_rate":{"6mth":3.4},"dnas":{"6mth":0.6},"cancellations":{"6mth":12.4},"not_rebooked":{"6mth":2}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Erin Duthie')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.4},"occupancy_pct":{"6mth":0.83},"npbr_recommendations":{"6mth":12.9},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":6.9},"dnas":{"6mth":1.2},"cancellations":{"6mth":14.8},"not_rebooked":{"6mth":4.3}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Sam Johnston')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.8},"occupancy_pct":{"6mth":0.69},"npbr_recommendations":{"6mth":6.8},"new_patients":{"6mth":1.1},"new_pt_booking_rate":{"6mth":6.6},"dnas":{"6mth":0.3},"cancellations":{"6mth":5.2},"not_rebooked":{"6mth":1}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Lachlan Brazier')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":3.6},"occupancy_pct":{"6mth":0.83},"npbr_recommendations":{"6mth":12.3},"new_patients":{"6mth":2.4},"new_pt_booking_rate":{"6mth":4.9},"dnas":{"6mth":1.1},"cancellations":{"6mth":18.1},"not_rebooked":{"6mth":4.3}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Samantha Delohery')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.6},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":12.3},"new_patients":{"6mth":1.8},"new_pt_booking_rate":{"6mth":7},"dnas":{"6mth":0.9},"cancellations":{"6mth":14},"not_rebooked":{"6mth":3.5}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Wilson Page')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":2.6},"occupancy_pct":{"6mth":0.67},"npbr_recommendations":{"6mth":5.8},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":3.1},"dnas":{"6mth":0.4},"cancellations":{"6mth":5.8},"not_rebooked":{"6mth":1.7}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Jake Mitchell')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":6.6},"occupancy_pct":{"6mth":0.81},"npbr_recommendations":{"6mth":14.2},"new_patients":{"6mth":2.6},"new_pt_booking_rate":{"6mth":5.7},"dnas":{"6mth":1.1},"cancellations":{"6mth":14.9},"not_rebooked":{"6mth":4}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Tayla Cattanach')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.5},"occupancy_pct":{"6mth":0.78},"npbr_recommendations":{"6mth":17.8},"new_patients":{"6mth":2.6},"new_pt_booking_rate":{"6mth":7.1},"dnas":{"6mth":1.2},"cancellations":{"6mth":14.3},"not_rebooked":{"6mth":4.5}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Dean Walker')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":5.1},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":11.5},"new_patients":{"6mth":2.1},"new_pt_booking_rate":{"6mth":6},"dnas":{"6mth":1.8},"cancellations":{"6mth":17.3},"not_rebooked":{"6mth":4.2}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Ilan Berkowitz')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":8.2},"occupancy_pct":{"6mth":0.82},"npbr_recommendations":{"6mth":14.8},"new_patients":{"6mth":1.9},"new_pt_booking_rate":{"6mth":7.7},"dnas":{"6mth":1.3},"cancellations":{"6mth":13.9},"not_rebooked":{"6mth":3.9}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"},"core_values":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Marcio Dos Santos')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":10.6},"occupancy_pct":{"6mth":0.91},"npbr_recommendations":{"6mth":5.1},"new_patients":{"6mth":1.1},"new_pt_booking_rate":{"6mth":4.6},"dnas":{"6mth":1.1},"cancellations":{"6mth":19.1},"not_rebooked":{"6mth":2.6}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"above_and_beyond"},"teamwork":{"6mth":"above_and_beyond"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"above_and_beyond"},"compassion":{"6mth":"above_and_beyond"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Nick Baxter')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":3.6},"occupancy_pct":{"6mth":0.74},"npbr_recommendations":{"6mth":15.2},"new_patients":{"6mth":2.7},"new_pt_booking_rate":{"6mth":5},"dnas":{"6mth":0.2},"cancellations":{"6mth":11.1},"not_rebooked":{"6mth":4.4}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"above_and_beyond"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"demonstrated"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Imogen O''Neill')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;

update performance_reviews
set kpi_rollups = '{"fba":{"6mth":4.3},"occupancy_pct":{"6mth":0.67},"npbr_recommendations":{"6mth":15.2},"new_patients":{"6mth":2.4},"new_pt_booking_rate":{"6mth":6.9},"dnas":{"6mth":0.9},"cancellations":{"6mth":8.2},"not_rebooked":{"6mth":3}}'::jsonb,
    kpa_rollups = '{"courage":{"6mth":"demonstrated"},"teamwork":{"6mth":"demonstrated"},"accountability":{"6mth":"demonstrated"},"joy":{"6mth":"demonstrated"},"compassion":{"6mth":"demonstrated"},"integrity":{"6mth":"above_and_beyond"},"excellence":{"6mth":"demonstrated"}}'::jsonb
where provider_id = (select id from providers where name = 'Riley Fairhurst')
  and completed_at is not null and kpi_rollups = '{}'::jsonb and kpa_rollups = '{}'::jsonb;
