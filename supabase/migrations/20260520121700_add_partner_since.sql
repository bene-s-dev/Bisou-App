-- Add partner_since to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_since TIMESTAMP WITH TIME ZONE;

-- Update link_partners to set partner_since
CREATE OR REPLACE FUNCTION public.link_partners(partner_code_to_link TEXT)
RETURNS VOID AS $$
DECLARE
    partner_id_found UUID;
    now_ts TIMESTAMP WITH TIME ZONE;
BEGIN
    now_ts := now();

    -- 1. Find the partner
    SELECT id INTO partner_id_found
    FROM public.profiles
    WHERE partner_code = upper(trim(partner_code_to_link));

    IF partner_id_found IS NULL THEN
        RAISE EXCEPTION 'Code nicht gefunden!';
    END IF;

    IF partner_id_found = auth.uid() THEN
        RAISE EXCEPTION 'Du kannst dich nicht mit dir selbst verknüpfen!';
    END IF;

    -- 2. Update both profiles
    UPDATE public.profiles
    SET partner_id = partner_id_found,
        partner_since = now_ts
    WHERE id = auth.uid();

    UPDATE public.profiles
    SET partner_id = auth.uid(),
        partner_since = now_ts
    WHERE id = partner_id_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update unlink_partners to clear partner_since
CREATE OR REPLACE FUNCTION public.unlink_partners()
RETURNS VOID AS $$
DECLARE
    current_partner_id UUID;
BEGIN
    -- 1. Get current partner
    SELECT partner_id INTO current_partner_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF current_partner_id IS NOT NULL THEN
        -- 2. Set both to NULL
        UPDATE public.profiles
        SET partner_id = NULL,
            partner_since = NULL
        WHERE id = auth.uid();

        UPDATE public.profiles
        SET partner_id = NULL,
            partner_since = NULL
        WHERE id = current_partner_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
