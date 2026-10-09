-- Exercise Physiology curriculum — there's no sheet for this one (EP was
-- never tracked before), constructed with the director: joint-based
-- regions in the same 3-module shape as his own existing pattern
-- (Conditions & Presentation → Assessment → Exercise Prescription — no
-- manual-therapy "Treatment" module, since that's not EP's scope), plus
-- three pillars that are genuinely EP's own territory rather than
-- physio-minus-treatment: Chronic Disease Management (the actual legal/
-- clinical point of difference from physio — Medicare's EPC program exists
-- specifically for this), Performance & Strength and Conditioning (same
-- territory as the physios' own "Performance Training" curriculum, kept
-- separate here since it's EP's core work, not a specialty add-on), and
-- Injury Rehab & Return to Function. Weighted toward chronic disease and
-- performance on purpose — that's what makes this EP, not physio.
insert into training_topics (training_group, category, name, sort_order) values
('ep', 'Lumbar Spine', 'Conditions & Clinical Presentation', 1),
('ep', 'Lumbar Spine', 'Assessment', 2),
('ep', 'Lumbar Spine', 'Exercise Prescription', 3),

('ep', 'Cervical Spine', 'Conditions & Clinical Presentation', 10),
('ep', 'Cervical Spine', 'Assessment', 11),
('ep', 'Cervical Spine', 'Exercise Prescription', 12),

('ep', 'Shoulder', 'Conditions & Clinical Presentation', 20),
('ep', 'Shoulder', 'Assessment', 21),
('ep', 'Shoulder', 'Exercise Prescription', 22),

('ep', 'Hip & Groin', 'Conditions & Clinical Presentation', 30),
('ep', 'Hip & Groin', 'Assessment', 31),
('ep', 'Hip & Groin', 'Exercise Prescription', 32),

('ep', 'Knee', 'Conditions & Clinical Presentation', 40),
('ep', 'Knee', 'Assessment', 41),
('ep', 'Knee', 'Exercise Prescription', 42),

('ep', 'Ankle & Foot', 'Conditions & Clinical Presentation', 50),
('ep', 'Ankle & Foot', 'Assessment', 51),
('ep', 'Ankle & Foot', 'Exercise Prescription', 52),

('ep', 'Chronic Disease Management', 'Cardiac Rehabilitation', 60),
('ep', 'Chronic Disease Management', 'Diabetes (Type 1 & 2) Exercise Management', 61),
('ep', 'Chronic Disease Management', 'Cancer & Exercise Oncology', 62),
('ep', 'Chronic Disease Management', 'Respiratory Conditions (COPD, Asthma)', 63),
('ep', 'Chronic Disease Management', 'Osteoporosis & Bone Health', 64),
('ep', 'Chronic Disease Management', 'Neurological Conditions (Parkinson''s, Stroke, MS)', 65),
('ep', 'Chronic Disease Management', 'Mental Health & Exercise Prescription', 66),

('ep', 'Performance & Strength and Conditioning', 'Performance Testing & Profiling', 70),
('ep', 'Performance & Strength and Conditioning', 'Periodisation & Program Design', 71),
('ep', 'Performance & Strength and Conditioning', 'Strength Training Progressions', 72),
('ep', 'Performance & Strength and Conditioning', 'Olympic Lifting Fundamentals', 73),
('ep', 'Performance & Strength and Conditioning', 'Speed & Agility Development', 74),
('ep', 'Performance & Strength and Conditioning', 'Plyometrics & Power Development', 75),
('ep', 'Performance & Strength and Conditioning', 'Energy Systems & Conditioning', 76),

('ep', 'Injury Rehab & Return to Function', 'Return-to-Sport Load Management', 80),
('ep', 'Injury Rehab & Return to Function', 'Post-Surgical Rehab Principles', 81),
('ep', 'Injury Rehab & Return to Function', 'Workcover / Functional Capacity Evaluation', 82),
('ep', 'Injury Rehab & Return to Function', 'Behaviour Change & Exercise Adherence', 83);
