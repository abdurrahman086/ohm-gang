-- Phase 2: periode kas aktif yang bisa dipilih manual (bukan sekadar due_date terbaru).
-- Migration: 0014_period_active.sql
-- CATATAN: jangan terapkan ke Supabase produksi tanpa backup + uji di lokal/staging (AGENTS.md).

ALTER TABLE public.cash_periods
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Maksimal satu periode aktif pada satu waktu.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_periods_single_active
  ON public.cash_periods (is_active)
  WHERE is_active = true;

-- Backfill: periode dengan jatuh tempo terbaru dijadikan aktif (hanya bila belum ada yang aktif).
WITH latest AS (
  SELECT id FROM public.cash_periods ORDER BY due_date DESC LIMIT 1
)
UPDATE public.cash_periods p
SET is_active = true
FROM latest
WHERE p.id = latest.id
  AND NOT EXISTS (SELECT 1 FROM public.cash_periods WHERE is_active = true);

-- Pindahkan periode aktif secara atomik (periode lain otomatis nonaktif).
CREATE OR REPLACE FUNCTION public.set_active_period(p_period_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')) THEN
    RAISE EXCEPTION 'Tidak berhak mengubah periode aktif';
  END IF;

  UPDATE public.cash_periods SET is_active = false WHERE is_active = true AND id <> p_period_id;
  UPDATE public.cash_periods SET is_active = true WHERE id = p_period_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_period(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_period(UUID) TO authenticated;
