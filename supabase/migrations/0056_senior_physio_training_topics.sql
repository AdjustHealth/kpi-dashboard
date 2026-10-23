-- Senior Physio's training_topics started deliberately bare (see
-- 0044_clinical_training.sql — "grown from the UI's own + Add topic from
-- here on rather than guessed at"). These are the director's own picks
-- off a gap analysis against what New Grad/Associate already cover, to
-- start building out the next tier up.
insert into training_topics (training_group, category, name, sort_order) values
('senior_physio', 'Spine', 'Ankylosing Spondylitis / Axial Spondyloarthritis', 10),
('senior_physio', 'Upper Limb', 'AC Joint Injuries', 20),
('senior_physio', 'Upper Limb', 'Wrist Instability (TFCC / Scapholunate)', 21),
('senior_physio', 'Upper Limb', 'Carpal Tunnel Syndrome', 22),
('senior_physio', 'Lower Limb', 'Achilles Tendinopathy / Rupture Rehab', 30),
('senior_physio', 'Lower Limb', 'MTSS / Shin Splints & Bone Stress Injuries', 31),
('senior_physio', 'Lower Limb', 'Patellofemoral Instability / Dislocation', 32),
('senior_physio', 'Lower Limb', 'Peroneal Tendinopathy', 33),
('senior_physio', 'Head & Complex', 'Concussion / mTBI Management', 40);
