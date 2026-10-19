-- Marcio tracks "Staff Meeting Prep" instead of "Social Media Reel Posted"
-- on his own KPI Scorecard (director's call) -- see lib/providerSchema.ts's
-- swap_sm_reel_for_staff_meeting_prep flag. Sam and any future senior
-- physio keep the shared Social Media Reel Posted / Blog Posted set
-- untouched; this is scoped to Marcio's own providers row only.
update providers
set targets = targets || '{"swap_sm_reel_for_staff_meeting_prep": true}'::jsonb
where name = 'Marcio Dos Santos';
