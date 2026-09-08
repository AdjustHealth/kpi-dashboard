-- Allows "last_attendances" as a nookal_uploads.report_type — added to the
-- app (lib/schema.ts) for the Last Attendances Report (no-future-booking
-- drop-off detection), same recurring oversight as migrations 0004/0034
-- (this check constraint isn't auto-kept in sync with the app's list).
alter table nookal_uploads drop constraint if exists nookal_uploads_report_type_check;
alter table nookal_uploads add constraint nookal_uploads_report_type_check check (report_type in (
  'activity', 'business_performance', 'occupancy',
  'clients_and_cases', 'providers_and_practice', 'providers_and_practice_12mo',
  'activity_pre_employment_12mo', 'cancellations', 'last_attendances', 'aged_debtors'
));
