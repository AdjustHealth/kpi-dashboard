-- "Head & Complex" lumped headache/vestibular topics in with paediatric,
-- chronic pain and return-to-sport — none of which are head-related, so the
-- category read as arbitrary. Splits it into what the topics actually are:
-- Head & Vestibular (genuinely head-related) and Specialty Presentations
-- (complex/less-common case types that don't belong to a body region).
update training_topics set category = 'Head & Vestibular'
where training_group = 'associate' and name in ('Watson Headache — Advanced', 'Vestibular Rehabilitation — Advanced');

update training_topics set category = 'Specialty Presentations'
where training_group = 'associate' and name in ('Paediatric & Growth-Related Injuries', 'Complex Chronic Pain & Biopsychosocial', 'Return to Sport — Advanced Load Management');
