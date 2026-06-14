-- Create secure function to delete the authenticated user's account
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get the authenticated user's ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert';
    END IF;

    -- Delete the user from auth.users (this will cascade delete profiles, answers, streaks, etc. if foreign keys have ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
