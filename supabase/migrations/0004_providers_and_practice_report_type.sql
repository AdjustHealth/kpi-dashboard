-- Allows "providers_and_practice" as a nookal_uploads.report_type — the
-- report type was added to the app (lib/schema.ts) but this check
-- constraint was never updated, so every upload of that report type failed.
alter table nookal_uploads drop constraint nookal_uploads_report_type_check;
alter table nookal_uploads add constraint nookal_uploads_report_type_check check (report_type in (
  'activity', 'business_performance', 'occupancy',
  'clients_and_cases', 'providers_and_practice', 'cancellations', 'aged_debtors'
));
