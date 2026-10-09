-- Backfills New Graduates completions for staff who'd already finished Tier 1
-- before Clinical Training existed as a real feature — per-topic, not a
-- blanket "everyone's done everything": read directly off the director's
-- real "Training Log" sheet (not the richer session-by-session sheet, which
-- has no completion data in it at all, just the curriculum structure).
-- Matches providers by first name only (same heuristic lib/providerIdentity.ts's
-- myProvider() already uses for this exact reason — there's no stored
-- mapping from a sheet name to a providers row). completed_at is a rough
-- placeholder (this system wasn't live yet, so there's no real date to use) —
-- fix it from a group's own page if the exact date ever matters.
-- Deliberately excludes the 3 new "Clinical Foundations" topics (Outcome
-- Measures, Exercise Prescription Fundamentals, Red Flag Screening) — those
-- didn't exist on the sheet, so nobody could have "already done" them.

-- Lumbar Spine: everyone, including the two current New Grads (Imogen, Riley).
insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Imogen','Riley','Dean','Wilson','Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad' and t.name = 'Lumbar Spine'
on conflict (topic_id, provider_id) do nothing;

-- SIJ / Thoracic Spine / TMJ: everyone except Dean and Wilson.
insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad' and t.name in ('SIJ', 'Thoracic Spine', 'TMJ')
on conflict (topic_id, provider_id) do nothing;

-- Every other original topic: everyone except the two current New Grads.
insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Dean','Wilson','Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad'
  and t.name in ('Cervical Spine', 'Shoulder', 'Hip & Groin', 'Knee', 'Ankle & Foot', 'Elbow & Forearm', 'Wrist & Hand', 'Taping', 'Upper Cervical & Headache', 'Pain Science & Central Sensitisation', 'NDIS Clinical')
on conflict (topic_id, provider_id) do nothing;
