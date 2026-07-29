-- Podiatry ageing debt was never auto-derivable from the Aged Debtors report
-- (no location column to split Adjust from Podiatry) and stayed manual/blank
-- most weeks. Dropping the fields entirely per director request rather than
-- leaving unused columns and input fields around.
alter table weekly_kpis
  drop column if exists ad_pod_total_private,
  drop column if exists ad_pod_actual_private,
  drop column if exists ad_pod_ndis,
  drop column if exists ad_pod_3rd_party_61_90,
  drop column if exists ad_pod_3rd_party_90,
  drop column if exists ad_pod_medicare_dva_31,
  drop column if exists ad_pod_total;
