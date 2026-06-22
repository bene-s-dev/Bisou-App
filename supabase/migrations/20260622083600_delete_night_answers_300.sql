-- Delete the milestone 'Herrscher der Nacht' (300 nachts beantwortete Fragen) and its unlocked records to make sure we have exactly 250 in total.
DELETE FROM public.unlocked_milestones 
WHERE milestone_id IN (
    SELECT id FROM public.milestones 
    WHERE trigger_type = 'night_answers' AND trigger_value = 300
);

DELETE FROM public.milestones 
WHERE trigger_type = 'night_answers' AND trigger_value = 300;
