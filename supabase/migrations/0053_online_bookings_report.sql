-- Adds the real "Online Bookings Report" as a Nookal upload type, and the
-- clinic-wide "any channel" booking totals it feeds (all_bookings_total/
-- all_bookings_online/all_bookings_online_pct) alongside the existing
-- new-clients-only pair (online_bookings_total/online_bookings_new).
--
-- Also removes the admin's old manual "Online Booking" tick from the New
-- Client Checklist — online_bookings_total/online_bookings_new are now
-- auto-counted from this real report instead (see applyReport.ts's
-- "online_bookings" branch), so a human no longer needs to remember to
-- tick it per client every week. onboarding_video_sent/followup_call_made
-- are untouched — those stay genuinely manual tasks, unrelated to this.
alter table weekly_kpis
  add column if not exists all_bookings_total integer,
  add column if not exists all_bookings_online integer;

alter table weekly_kpis add column if not exists all_bookings_online_pct numeric generated always as (
  case when all_bookings_total > 0
    then all_bookings_online::numeric / all_bookings_total
    else null
  end
) stored;

alter table admin_new_client_tasks drop column if exists online_booking;

alter table nookal_uploads drop constraint if exists nookal_uploads_report_type_check;
alter table nookal_uploads add constraint nookal_uploads_report_type_check check (report_type in (
  'activity', 'business_performance', 'occupancy',
  'clients_and_cases', 'providers_and_practice', 'providers_and_practice_12mo',
  'activity_pre_employment_12mo', 'cancellations', 'last_attendances', 'aged_debtors',
  'online_bookings'
));
