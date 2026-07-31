-- Director correction: OBV Number Not Sent and Rx Notes Made are each
-- admin's own individual number, not one shared clinic-wide figure — moving
-- back to per-admin (provider_weekly.metrics, no migration needed there,
-- it's jsonb). Answered Calls stays genuinely shared/clinic-wide, but is
-- calculated and entered daily (Mon-Sat) rather than as one weekly number.
alter table weekly_kpis
  drop column if exists admin_obv_not_sent,
  drop column if exists admin_rx_notes_pct;

alter table weekly_kpis
  add column if not exists admin_answered_calls_mon numeric,
  add column if not exists admin_answered_calls_tue numeric,
  add column if not exists admin_answered_calls_wed numeric,
  add column if not exists admin_answered_calls_thu numeric,
  add column if not exists admin_answered_calls_fri numeric,
  add column if not exists admin_answered_calls_sat numeric;

alter table weekly_kpis drop column if exists admin_answered_calls_pct;
alter table weekly_kpis add column admin_answered_calls_pct numeric generated always as (
  case
    when (
      (case when admin_answered_calls_mon is not null then 1 else 0 end) +
      (case when admin_answered_calls_tue is not null then 1 else 0 end) +
      (case when admin_answered_calls_wed is not null then 1 else 0 end) +
      (case when admin_answered_calls_thu is not null then 1 else 0 end) +
      (case when admin_answered_calls_fri is not null then 1 else 0 end) +
      (case when admin_answered_calls_sat is not null then 1 else 0 end)
    ) = 0 then null
    else (
      coalesce(admin_answered_calls_mon, 0) + coalesce(admin_answered_calls_tue, 0) +
      coalesce(admin_answered_calls_wed, 0) + coalesce(admin_answered_calls_thu, 0) +
      coalesce(admin_answered_calls_fri, 0) + coalesce(admin_answered_calls_sat, 0)
    ) / (
      (case when admin_answered_calls_mon is not null then 1 else 0 end) +
      (case when admin_answered_calls_tue is not null then 1 else 0 end) +
      (case when admin_answered_calls_wed is not null then 1 else 0 end) +
      (case when admin_answered_calls_thu is not null then 1 else 0 end) +
      (case when admin_answered_calls_fri is not null then 1 else 0 end) +
      (case when admin_answered_calls_sat is not null then 1 else 0 end)
    )
  end
) stored;
