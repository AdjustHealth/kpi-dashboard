-- Allows "providers_and_practice_12mo" and "activity_pre_employment_12mo" as
-- nookal_uploads.report_type — added to the app (lib/schema.ts) for the PVA
-- (excl. pre-employment) swap replacing UCVA, same oversight as migration
-- 0004 (this check constraint isn't auto-kept in sync with the app's list).
alter table nookal_uploads drop constraint if exists nookal_uploads_report_type_check;
alter table nookal_uploads add constraint nookal_uploads_report_type_check check (report_type in (
  'activity', 'business_performance', 'occupancy',
  'clients_and_cases', 'providers_and_practice', 'providers_and_practice_12mo',
  'activity_pre_employment_12mo', 'cancellations', 'aged_debtors'
));
