-- Delete the milestone for 300 nudges and its unlocked records to make sure we have 250 in total.
DELETE FROM public.unlocked_milestones 
WHERE milestone_id IN (
    SELECT id FROM public.milestones 
    WHERE trigger_type = 'nudges_sent' AND trigger_value = 300
);

DELETE FROM public.milestones 
WHERE trigger_type = 'nudges_sent' AND trigger_value = 300;
