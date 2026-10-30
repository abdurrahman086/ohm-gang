-- 0022_managed_profile_edits.sql
-- Permit the authenticated account-management Edge Function (service role)
-- to update full_name and phone_number after its wali_kelas/target-role checks.
-- Role, student ID, and avatar changes remain developer-only.

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile identity is immutable';
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.student_id_number IS DISTINCT FROM OLD.student_id_number
      OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     AND NOT public.has_role('developer'::public.user_role) THEN
    RAISE EXCEPTION 'Only developers may change role, student ID, or avatar fields';
  END IF;

  IF (NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.phone_number IS DISTINCT FROM OLD.phone_number)
     AND NOT public.has_role('developer'::public.user_role)
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only developers or the account-management service may change name or phone';
  END IF;

  RETURN NEW;
END;
$$;
