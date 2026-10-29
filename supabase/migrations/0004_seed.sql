-- 0004_seed.sql — Data awal opsional.
-- Gunakan identitas asli kelas. Periode kas bisa dibuat via DeveloperPanel (Fase 8).

-- ============ Role pengurus (ganti UUID dengan id profil dari auth) ============
-- Setelah user daftar, promosikan role via dashboard Supabase:
--   UPDATE public.profiles SET role = 'keuangan'    WHERE id = '<uuid>';
--   UPDATE public.profiles SET role = 'wali_kelas'  WHERE id = '<uuid>';
--   UPDATE public.profiles SET role = 'developer'   WHERE id = '<uuid>';

-- ============ Periode kas awal ============
-- INSERT INTO public.cash_periods (title, due_date, amount) VALUES
--   ('Kas Minggu Ke-1 September', '2026-09-04', 5000.00),
--   ('Kas Minggu Ke-2 September', '2026-09-11', 5000.00),
--   ('Kas Minggu Ke-3 September', '2026-09-18', 5000.00),
--   ('Kas Minggu Ke-4 September', '2026-09-25', 5000.00);