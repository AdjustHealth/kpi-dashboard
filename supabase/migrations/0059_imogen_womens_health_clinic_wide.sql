-- Imogen's Women's Health Init/Sub (specialty_metrics, see 0055) have been
-- manual-entry-only since they were created -- nobody ever gave her
-- targets.specialty_clinic_wide_key, the same flag that already makes
-- Marcio's Headache Init/Sub auto-fill from the weekly Activity Report
-- upload instead of being typed in by hand (see the "activity" branch and
-- SPECIALTY_METRIC_PREFIX_TO_CATEGORY in lib/nookal/applyReport.ts -- this
-- migration pairs with a code change there adding a womens_health entry to
-- that map, without which this flag alone does nothing).
update providers
set targets = coalesce(targets, '{}'::jsonb) || '{"specialty_clinic_wide_key": "womens_health"}'::jsonb
where name = 'Imogen O''Neill';
