-- Seeds Massage Therapy's curriculum from the director's "Massage 2.0
-- Training" sheet — the clinical topics only (joint blocks' A/B/C sessions,
-- dry needling, neurodynamics, joint mobilisation, exercise prescription),
-- same approach as New Graduates: leadership/business/mindset sessions
-- interleaved in that sheet (Cancellation Busting, Objection Handling,
-- Mindset, Peak Performance, Numbers, Communication, Leadership, Tone &
-- Body Language) and the recurring "Client Centred Consult Review and Role
-- Play" / "Review & Troubleshoot" checkpoints are left out — not clinical
-- topics to track completion of. No completions seeded: unlike the
-- director's physio Training Log, this sheet has no real ticks recorded
-- for Erin or Jake, just the topic list itself.
insert into training_topics (training_group, category, name, sort_order) values
('massage', 'Lumbar Spine', 'Lumbar A', 2),
('massage', 'Lumbar Spine', 'Lumbar B', 3),
('massage', 'Lumbar Spine', 'Lumbar C', 4),

('massage', 'Cervical Spine', 'Cervical A', 12),
('massage', 'Cervical Spine', 'Cervical B', 13),
('massage', 'Cervical Spine', 'Cervical C', 14),

('massage', 'Shoulder & Scapular', 'Shoulder / Scap A', 21),
('massage', 'Shoulder & Scapular', 'Shoulder / Scap B', 22),
('massage', 'Shoulder & Scapular', 'Shoulder / Scap C', 23),

('massage', 'Posterior Hip', 'Posterior Hip A', 30),
('massage', 'Posterior Hip', 'Posterior Hip B', 31),
('massage', 'Posterior Hip', 'Posterior Hip C', 32),

('massage', 'Groin', 'Groin Pain A', 39),
('massage', 'Groin', 'Groin Pain B', 40),
('massage', 'Groin', 'Groin Pain C', 41),

('massage', 'Elbow & Wrist', 'Elbow and Wrist A', 48),
('massage', 'Elbow & Wrist', 'Elbow and Wrist B', 49),
('massage', 'Elbow & Wrist', 'Elbow and Wrist C', 50),

('massage', 'Ankle & Foot', 'Ankle / Foot A', 55),
('massage', 'Ankle & Foot', 'Ankle / Foot B', 56),
('massage', 'Ankle & Foot', 'Ankle / Foot C', 57),

('massage', 'Dry Needling', 'Dry Needling — Cervical', 64),
('massage', 'Dry Needling', 'Dry Needling — Shoulder', 65),
('massage', 'Dry Needling', 'Dry Needling — Thoracic', 66),
('massage', 'Dry Needling', 'Dry Needling — Lumbar', 67),
('massage', 'Dry Needling', 'Dry Needling — Hip', 70),
('massage', 'Dry Needling', 'Dry Needling — Knee', 71),
('massage', 'Dry Needling', 'Dry Needling — Foot & Ankle', 72),
('massage', 'Dry Needling', 'Dry Needling — Elbow', 73),

('massage', 'Neurodynamics', 'Neurodynamics — Upper Limb A', 79),
('massage', 'Neurodynamics', 'Neurodynamics — Upper Limb B', 80),
('massage', 'Neurodynamics', 'Neurodynamics — Lower Limb A', 81),
('massage', 'Neurodynamics', 'Neurodynamics — Lower Limb B', 82),

('massage', 'Joint Mobilisation', 'Joint Mobilisation A', 87),
('massage', 'Joint Mobilisation', 'Joint Mobilisation B', 88),
('massage', 'Joint Mobilisation', 'Joint Mobilisation C', 89),

('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Neck', 96),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Lumbar', 97),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Shoulder', 98),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Hip', 99),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Knee', 100),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Foot & Ankle', 101),
('massage', 'Exercise Prescription', 'Basic Exercise Prescription — Core', 102);
