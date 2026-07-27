-- diary_mgmt_pct was computed as bookings_start_week / bookings_following_week
-- (476/435 = 109.4% for week ending 25/07/2026) — the wrong two fields
-- entirely. The label ("Percentage: total completed appts / # start of
-- week") and the director's own spreadsheet both compute it as
-- total_consults / bookings_start_week (426/476 = 89.5%). Fixed to match.
alter table weekly_kpis drop column diary_mgmt_pct;
alter table weekly_kpis add column diary_mgmt_pct numeric generated always as (
  case when bookings_start_week > 0
    then total_consults::numeric / bookings_start_week
    else null
  end
) stored;
