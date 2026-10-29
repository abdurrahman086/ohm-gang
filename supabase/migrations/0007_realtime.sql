-- 0007_realtime.sql — Aktifkan Realtime (Postgres Changes) untuk tabel kas
-- Supabase hanya mengirim perubahan untuk tabel terdaftar di publikasi ini.
-- Asumsi: dijalankan setelah 0002_rls.sql. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cash_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions;
  END IF;
END $$;