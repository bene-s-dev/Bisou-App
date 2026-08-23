-- Secure RPC to reset Bene's password directly if needed
CREATE OR REPLACE FUNCTION public.set_admin_password(p_new_password text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF length(p_new_password) < 6 THEN
    RETURN 'Passwort muss mindestens 6 Zeichen lang sein.';
  END IF;

  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = '438bce53-5c85-4035-82a1-d6fbd23bc1e8';

  RETURN 'Passwort für Bene erfolgreich aktualisiert!';
END;
$$;
