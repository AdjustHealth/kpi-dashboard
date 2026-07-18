-- Ageing Debts — the director's "C. Ageing Debts" / "AGEING DEBT PODIATRY"
-- sheet sections had nowhere to live in weekly_kpis at all. All manual: the
-- Nookal Aged Debtors report only exports "All Locations" combined and
-- groups by payer type rather than individual client, so it can't tell us
-- which of a "[Private]" balance is a true private-pay client vs. an NDIS
-- self-managed client invoiced as Private, and it can't split Adjust
-- Physiotherapy from Podiatry — not safe to auto-derive on figures this
-- sensitive. See lib/schema.ts for the full field list/rationale.
alter table weekly_kpis
  add column if not exists ad_total_private numeric,
  add column if not exists ad_actual_private numeric,
  add column if not exists ad_ndis numeric,
  add column if not exists ad_3rd_party_61_90 numeric,
  add column if not exists ad_3rd_party_90 numeric,
  add column if not exists ad_medicare_dva_31 numeric,
  add column if not exists ad_total numeric,
  add column if not exists ad_pod_total_private numeric,
  add column if not exists ad_pod_actual_private numeric,
  add column if not exists ad_pod_ndis numeric,
  add column if not exists ad_pod_3rd_party_61_90 numeric,
  add column if not exists ad_pod_3rd_party_90 numeric,
  add column if not exists ad_pod_medicare_dva_31 numeric,
  add column if not exists ad_pod_total numeric;
