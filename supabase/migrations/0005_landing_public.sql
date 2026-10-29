-- 0005_landing_public.sql — Landing publik: profiles terbaca anon (tanpa phone_number)
-- Asumsi: dijalankan setelah 0002_rls.sql.

-- Landing (PRD §4.1) menampilkan nama, foto, peran, dan status kas di halaman publik.
-- phone_number TIDAK boleh bocor: revoke akses kolom untuk anon.
CREATE POLICY "Profiles readable by everyone (landing)"
ON public.profiles FOR SELECT TO anon, authenticated
USING (true);

REVOKE SELECT (phone_number) ON public.profiles FROM anon;