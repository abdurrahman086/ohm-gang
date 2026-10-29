-- 0017_profile_privileges.sql
-- Perbaikan lanjutan: bagian 0011 yang juga tidak pernah masuk ke database.
-- Tanpa ini, RLS "Users update own profile" mengizinkan user mengubah kolom role
-- pada barisnya sendiri → siapa pun bisa menaikkan dirinya jadi developer/wali_kelas.

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
      OR NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.student_id_number IS DISTINCT FROM OLD.student_id_number
      OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
      OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     AND NOT public.has_role('developer'::public.user_role) THEN
    RAISE EXCEPTION 'Only developers may change identity or role fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- phone_number & student_id_number tidak boleh terbaca client biasa.
-- Aplikasi hanya memilih kolom eksplisit (lihat useAuth & apiUsers.fetchProfiles).
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, role, bio, interests, achievements, created_at)
ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (id uuid, full_name text, student_id_number text, role public.user_role, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('developer'::public.user_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.student_id_number, p.role, p.created_at
    FROM public.profiles p ORDER BY p.created_at;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;
