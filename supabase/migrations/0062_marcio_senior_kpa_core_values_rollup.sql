-- 0061 wrote Marcio Dos Santos's imported KPA ratings under the 7 individual
-- Core Values keys (courage/teamwork/accountability/joy/compassion/
-- integrity/excellence). That's right for every OTHER imported provider,
-- but Marcio is role:"senior_physio", and kpaGroupsForRole() renders only
-- SENIOR_KPA_FIELDS for that role -- a single "core_values" key plus 5
-- senior-specific fields (speciality_service_growth, lead_junior_staff,
-- clinical_training, marketing_internal, marketing_external) with no sheet
-- equivalent. His review page never reads the 7 individual keys at all, so
-- without this his "vs Last Review" KPA comparison stays blank.
--
-- Rolls his 7 imported ratings into one "core_values" rating the same way
-- computeKpaRollups does (score 0/1/2, average, round half down):
-- above_and_beyond, above_and_beyond, demonstrated, above_and_beyond,
-- above_and_beyond, above_and_beyond, demonstrated
-- = (2+2+1+2+2+2+1)/7 = 1.71 -> above_and_beyond.
--
-- Keeps the original 7 keys in place (harmless, unread by his page) and
-- merges core_values alongside them.

update performance_reviews
set kpa_rollups = kpa_rollups || '{"core_values":{"6mth":"above_and_beyond"}}'::jsonb
where provider_id = (select id from providers where name = 'Marcio Dos Santos')
  and review_date = (select max(review_date) from performance_reviews where provider_id = (select id from providers where name = 'Marcio Dos Santos'));
