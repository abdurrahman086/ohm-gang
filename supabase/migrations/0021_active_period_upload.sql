-- 0021_active_period_upload.sql
-- Kunci upload bukti QRIS ke periode aktif. Jalankan SETELAH aplikasi v1 live.
-- Catatan: hanya menolak income QRIS pending; tunai/pengeluaran tidak terpengaruh.

CREATE OR REPLACE FUNCTION public.enforce_active_period_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.type = 'income' AND NEW.method = 'qris' AND NEW.status = 'pending' THEN
    IF NEW.period_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.cash_periods p
      WHERE p.id = NEW.period_id AND p.is_active
    ) THEN
      RAISE EXCEPTION 'Periode kas tidak aktif. Upload bukti ditutup.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_active_period_upload ON public.cash_transactions;
CREATE TRIGGER enforce_active_period_upload
BEFORE INSERT ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_period_upload();
