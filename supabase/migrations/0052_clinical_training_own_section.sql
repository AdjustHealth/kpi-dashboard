-- Clinical Training was gated by the same "Team" section grant as
-- Performance Reviews (0044_clinical_training.sql), on the assumption
-- whoever should see one should see the other. Turns out not true: Marcio
-- and Sam (senior physios) need Clinical Training on their own dashboards,
-- but Performance Reviews shows the WHOLE team's review due-dates/history,
-- which the director doesn't want handed to them just to unlock Clinical
-- Training. Splits Clinical Training into its own grantable section,
-- "clinical_training" (see lib/auth/access.ts SECTIONS) — same "narrower
-- grant carved out of a wider one" pattern as specialty_services inside
-- clinic_reports. Write access is unchanged: directors only, at every
-- command, so there's still no path for a staff login to tick its own box.
drop policy "team can read training topics" on training_topics;
create policy "section can read training topics" on training_topics
  for select using (can_access_section('clinical_training'));

drop policy "team can read training completions" on training_completions;
create policy "section can read training completions" on training_completions
  for select using (can_access_section('clinical_training'));
