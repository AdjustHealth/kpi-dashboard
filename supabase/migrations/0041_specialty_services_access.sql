-- Specialty Services carved out as its own narrower grant — a login can
-- get just /clinic/specialty without the rest of Clinic Reports (Revenue,
-- Clinic Health, Cancellations, Quarterly). can_access_section() already
-- accepts any text value with no schema change needed (see migration
-- 0039_section_level_access.sql); this just adds "specialty_services" as
-- an alternative to "clinic_reports" on weekly_kpis' read policy, since
-- that's the only table the Specialty Services page reads from
-- (lib/clinicData.ts getClinicHistory, via the ordinary RLS-scoped client).
drop policy "read scoped" on weekly_kpis;
create policy "read scoped" on weekly_kpis for select using (
  can_access_section('data_entry') or can_access_section('clinic_reports') or can_access_section('specialty_services')
);
