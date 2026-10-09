-- Seeds the director's "Performance Training" sheet into Associate Physio —
-- it's done by Ilan, Tayla and Samantha, who are already tracked there, so
-- it lives alongside their other Associate Physio topics rather than a
-- separate group. "Adjust Membership Model" (sales/business content, not a
-- clinical/technical skill) is left out, same filtering approach as every
-- other sheet. "Training strategy tool" appeared 5 times on the sheet with
-- no lift named — disambiguated per lift below.
insert into training_topics (training_group, category, name, sort_order) values
('associate', 'Performance Testing', 'Peak Performance Testing', 110),
('associate', 'Performance Testing', 'Jump Testing (CMJ, Squat, Drop Jump)', 111),
('associate', 'Performance Testing', 'Return to Running Iso Testing', 112),
('associate', 'Performance Testing', 'Lower Body Isometric', 113),
('associate', 'Performance Testing', 'Upper Body Isometric', 114),
('associate', 'Performance Testing', 'Maximal Strength Testing', 115),
('associate', 'Performance Testing', 'Conditioning Testing', 116),

('associate', 'Programming', 'Periodisation', 120),
('associate', 'Programming', 'Adjust Programming Model — Performance + Rehab', 121),
('associate', 'Programming', 'Practical — Planning a Program', 122),
('associate', 'Programming', 'Programming — LUMIN', 123),
('associate', 'Programming', 'LUMIN — Practical Demonstration', 124),
('associate', 'Programming', 'LUMIN — Construct a Mesocycle', 125),
('associate', 'Programming', 'LUMIN — Construct a Microcycle', 126),
('associate', 'Programming', 'LUMIN — Completing a Workout', 127),

('associate', 'Powerlifting', 'Squat', 130),
('associate', 'Powerlifting', 'Squat — Training Strategy Tool', 131),
('associate', 'Powerlifting', 'Bench', 132),
('associate', 'Powerlifting', 'Bench — Training Strategy Tool', 133),
('associate', 'Powerlifting', 'Deadlift', 134),
('associate', 'Powerlifting', 'Deadlift — Training Strategy Tool', 135),

('associate', 'Weightlifting', 'Clean & Jerk', 140),
('associate', 'Weightlifting', 'Clean & Jerk — Training Strategy Tool', 141),
('associate', 'Weightlifting', 'Snatch', 142),
('associate', 'Weightlifting', 'Snatch — Training Strategy Tool', 143),

('associate', 'Speed', 'Workshop: Maximal Velocity', 150),
('associate', 'Speed', 'Workshop: Acceleration', 151),
('associate', 'Speed', 'Workshop: Deceleration', 152),

('associate', 'Plyometrics', 'The Plyometric Continuum', 160),
('associate', 'Plyometrics', 'Lower Body Continuum & Tool', 161),
('associate', 'Plyometrics', 'Upper Body Continuum & Tool', 162),

('associate', 'Conditioning', 'Energy Systems', 170),
('associate', 'Conditioning', 'Aerobic Testing', 171),
('associate', 'Conditioning', 'Aerobic Testing Workshop', 172),
('associate', 'Conditioning', 'Anaerobic Testing', 173),
('associate', 'Conditioning', 'Anaerobic Testing Workshop', 174),

('associate', 'Injury-Specific Performance', 'Injury Specific Performance Systems', 180);
