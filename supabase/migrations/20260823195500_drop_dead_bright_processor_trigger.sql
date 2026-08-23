-- Drop dead trigger referencing non-existent edge function bright-processor
DROP TRIGGER IF EXISTS notify_partner_on_answer ON public.answers;
