-- Replaces New Graduates' one-topic-per-joint list with the real
-- session-by-session curriculum from the director's detailed training
-- sheet — each joint is 3-4 real sessions (anatomy/red flags, assessment,
-- treatment, exercise prescription), not one broad tick. Clinical
-- Foundations, Pain Science & Central Sensitisation and NDIS Clinical are
-- untouched — they're cross-cutting/single-session topics in the sheet too,
-- not joints, so there's nothing to split.
--
-- Deleting the old coarse topics cascades to training_completions (see
-- 0044's on delete cascade), which removes whatever backfilled completions
-- 0045 already wrote for them — re-seeded below at the new granularity
-- instead, using the exact same per-person, per-joint read of the Training
-- Log sheet 0045 used (safe to run whether or not 0045 ran first).
delete from training_topics
where training_group = 'new_grad'
  and name in ('Lumbar Spine', 'Cervical Spine', 'Thoracic Spine', 'SIJ', 'TMJ', 'Upper Cervical & Headache', 'Shoulder', 'Elbow & Forearm', 'Wrist & Hand', 'Hip & Groin', 'Knee', 'Ankle & Foot', 'Taping');

insert into training_topics (training_group, category, name, sort_order) values
('new_grad', 'Lumbar Spine', 'Common Conditions, Red Flags & Anatomy', 1),
('new_grad', 'Lumbar Spine', 'Lumbar Assessment & Palpation', 2),
('new_grad', 'Lumbar Spine', 'Lower Limb Neurodynamics & Neurological', 3),
('new_grad', 'Lumbar Spine', 'Lumbar Treatment', 4),

('new_grad', 'Cervical Spine', 'Common Conditions, Red Flags & Anatomy', 8),
('new_grad', 'Cervical Spine', 'Cervical Assessment & Palpation', 9),
('new_grad', 'Cervical Spine', 'Upper Limb Neurodynamics & Neurological', 10),
('new_grad', 'Cervical Spine', 'Cervical Treatment', 11),

('new_grad', 'Shoulder & Scapular', 'Common Conditions, Red Flags & Anatomy', 12),
('new_grad', 'Shoulder & Scapular', 'Shoulder Assessment & Palpation', 13),
('new_grad', 'Shoulder & Scapular', 'Shoulder Treatment', 14),
('new_grad', 'Shoulder & Scapular', 'Shoulder & Scapular Exercise Prescription', 15),

('new_grad', 'Upper Cervical Spine & Headaches', 'Theory of Headache Presentation', 19),
('new_grad', 'Upper Cervical Spine & Headaches', 'Upper Cervical Spine Assessment', 20),
('new_grad', 'Upper Cervical Spine & Headaches', 'Watson''s Headache Treatment', 21),
('new_grad', 'Upper Cervical Spine & Headaches', 'Case Studies & Clinical Reasoning', 22),

('new_grad', 'Hip & Groin', 'Common Conditions, Red Flags & Anatomy', 23),
('new_grad', 'Hip & Groin', 'Hip/Groin Assessment & Palpation', 24),
('new_grad', 'Hip & Groin', 'Hip & Groin Treatment', 25),
('new_grad', 'Hip & Groin', 'Core & Glute Exercise Prescription', 26),

('new_grad', 'Elbow & Forearm', 'Common Conditions, Red Flags & Anatomy', 30),
('new_grad', 'Elbow & Forearm', 'Elbow Assessment & Palpation', 31),
('new_grad', 'Elbow & Forearm', 'Elbow Treatment', 32),
('new_grad', 'Elbow & Forearm', 'Lateral Epicondylalgia Exercise Prescription', 33),

('new_grad', 'Knee', 'Common Conditions, Red Flags & Anatomy', 34),
('new_grad', 'Knee', 'Knee Assessment & Palpation', 35),
('new_grad', 'Knee', 'Acute Knee Injury Management', 36),
('new_grad', 'Knee', 'Knee Exercise Prescription', 37),

('new_grad', 'Taping', 'Lower Limb', 38),
('new_grad', 'Taping', 'Upper Limb', 39),
('new_grad', 'Taping', 'Review', 40),

('new_grad', 'Ankle & Foot', 'Common Conditions, Red Flags & Anatomy', 41),
('new_grad', 'Ankle & Foot', 'Ankle Assessment & Palpation', 42),
('new_grad', 'Ankle & Foot', 'Acute Ankle Injury Management', 43),
('new_grad', 'Ankle & Foot', 'Ankle Exercise Prescription', 44),

('new_grad', 'Sacro-Iliac Joint', 'Common Conditions, Red Flags & Anatomy', 45),
('new_grad', 'Sacro-Iliac Joint', 'SIJ Assessment & Palpation', 46),
('new_grad', 'Sacro-Iliac Joint', 'SIJ Treatment', 47),
('new_grad', 'Sacro-Iliac Joint', 'Functional Training & Anatomy Slings (KLT)', 48),

('new_grad', 'Thoracic / Costovertebral', 'Common Conditions, Red Flags & Anatomy', 49),
('new_grad', 'Thoracic / Costovertebral', 'Thoracic Assessment & Palpation', 50),
('new_grad', 'Thoracic / Costovertebral', 'Costo-Thoracic Treatment', 51),
('new_grad', 'Thoracic / Costovertebral', 'Scapulo-Thoracic Exercise Prescription', 52),

('new_grad', 'Temporomandibular Joint (TMJ)', 'Common Conditions, Red Flags & Anatomy', 53),
('new_grad', 'Temporomandibular Joint (TMJ)', 'TMJ Assessment & Palpation', 54),
('new_grad', 'Temporomandibular Joint (TMJ)', 'TMJ Treatment', 55),
('new_grad', 'Temporomandibular Joint (TMJ)', 'Linking TMJ with Upper Cervical', 56),

('new_grad', 'Wrist & Hand', 'Common Conditions, Red Flags & Anatomy', 57),
('new_grad', 'Wrist & Hand', 'Wrist/Hand Assessment', 58),
('new_grad', 'Wrist & Hand', 'Wrist/Hand Treatment', 59);

-- Re-seed completions at the new granularity — same read of the Training
-- Log sheet as 0045: Lumbar Spine's 4 modules for everyone (including the
-- two current New Grads), SIJ/Thoracic/TMJ's modules for everyone except
-- Dean and Wilson, every other joint's modules for everyone except the two
-- current New Grads.
insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Imogen','Riley','Dean','Wilson','Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad' and t.category = 'Lumbar Spine'
on conflict (topic_id, provider_id) do nothing;

insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad' and t.category in ('Sacro-Iliac Joint', 'Thoracic / Costovertebral', 'Temporomandibular Joint (TMJ)')
on conflict (topic_id, provider_id) do nothing;

insert into training_completions (topic_id, provider_id, completed_at, marked_by, note)
select t.id, p.id, '2025-06-01'::date, 'Backfill — Training Log sheet', 'Historical completion, exact date not recorded'
from training_topics t
join providers p on split_part(p.name, ' ', 1) = any (array['Dean','Wilson','Tayla','Samantha','Ilan','Sam','Marcio','Nick'])
where t.training_group = 'new_grad'
  and t.category in ('Cervical Spine', 'Shoulder & Scapular', 'Upper Cervical Spine & Headaches', 'Hip & Groin', 'Elbow & Forearm', 'Knee', 'Taping', 'Ankle & Foot', 'Wrist & Hand')
on conflict (topic_id, provider_id) do nothing;
