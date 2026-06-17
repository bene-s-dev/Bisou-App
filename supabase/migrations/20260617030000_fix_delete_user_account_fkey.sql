-- Migration to fix delete_user_account foreign key constraint violation
-- We update the function to set the partner's partner_id to NULL before deleting the user.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_partner_id uuid;
BEGIN
    -- Get the authenticated user's ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert';
    END IF;

    -- Find the partner ID of the deleting user
    SELECT partner_id INTO v_partner_id
    FROM public.profiles
    WHERE id = v_user_id;

    -- 1. Unlink the partner first (set partner_id to NULL on the partner's profile)
    -- to avoid "violates foreign key constraint" error on public.profiles
    IF v_partner_id IS NOT NULL THEN
        UPDATE public.profiles
        SET partner_id = NULL,
            partner_since = NULL
        WHERE id = v_partner_id;
    END IF;

    -- 2. Nullify current user's partner reference as well
    UPDATE public.profiles
    SET partner_id = NULL,
        partner_since = NULL
    WHERE id = v_user_id;

    -- 3. Delete the user from auth.users (this will cascade delete their profile, answers, streaks, etc.)
    DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
