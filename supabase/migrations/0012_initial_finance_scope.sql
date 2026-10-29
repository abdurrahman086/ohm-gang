-- QRIS configuration and cashier-recorded cash payments for the initial release.

-- Cleanup: Remove duplicate pending/approved income per student/period (keep latest)
DELETE FROM public.cash_transactions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, period_id) id 
  FROM public.cash_transactions 
  WHERE type = 'income' AND status IN ('pending', 'approved')
  ORDER BY user_id, period_id, created_at DESC
) AND type = 'income' AND status IN ('pending', 'approved');

CREATE TABLE public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  qris_image_path text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read payment settings"
ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance and homeroom manage payment settings"
ON public.payment_settings FOR UPDATE TO authenticated
USING (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer'))
WITH CHECK (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer'));
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;

-- Keep private proof object paths out of ordinary transaction queries.
REVOKE SELECT ON public.cash_transactions FROM anon, authenticated;
GRANT SELECT (id, user_id, period_id, type, amount, method, status, note,
  verified_by, created_at, updated_at)
ON public.cash_transactions TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-qris', 'payment-qris', true, 3145728, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

CREATE POLICY "QRIS image is publicly readable"
ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'payment-qris');
CREATE POLICY "Finance and homeroom upload QRIS image"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-qris' AND
  (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')));
CREATE POLICY "Finance and homeroom update QRIS image"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-qris' AND
  (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')))
WITH CHECK (bucket_id = 'payment-qris' AND
  (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')));
CREATE POLICY "Finance and homeroom delete QRIS image"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-qris' AND
  (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')));

-- A cashier records cash as paid in one action; QRIS remains member-submitted and pending.
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.cash_transactions;
DROP POLICY IF EXISTS "Valid payment or officer expense insert" ON public.cash_transactions;
CREATE POLICY "Valid payments and officer expenses insert"
ON public.cash_transactions FOR INSERT TO authenticated
WITH CHECK (
  amount > 0 AND (
    (type = 'income' AND method = 'qris' AND status = 'pending'
      AND user_id = auth.uid() AND verified_by IS NULL
      AND proof_url IS NOT NULL
      AND period_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.cash_periods p
        WHERE p.id = period_id AND p.amount = cash_transactions.amount)
      AND (proof_url IS NULL OR (storage.foldername(proof_url))[1] = auth.uid()::text))
    OR
    (type = 'income' AND method = 'cash' AND status = 'approved'
      AND period_id IS NOT NULL AND proof_url IS NULL
      AND verified_by = auth.uid()
      AND public.has_role('keuangan')
      AND EXISTS (SELECT 1 FROM public.cash_periods p
        WHERE p.id = period_id AND p.amount = cash_transactions.amount))
    OR
    (type = 'expense' AND status = 'approved' AND period_id IS NULL
      AND method IN ('cash', 'qris') AND proof_url IS NULL
      AND user_id = auth.uid() AND verified_by IS NULL
      AND (public.has_role('keuangan') OR public.has_role('developer')))
  )
);

DROP POLICY IF EXISTS "Finance and Admin can manage transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Finance can verify pending income" ON public.cash_transactions;
CREATE POLICY "Finance can verify pending QRIS income"
ON public.cash_transactions FOR UPDATE TO authenticated
USING (type = 'income' AND method = 'qris' AND status = 'pending'
  AND public.has_role('keuangan'))
WITH CHECK (type = 'income' AND method = 'qris' AND status IN ('approved', 'rejected')
  AND public.has_role('keuangan'));

CREATE OR REPLACE FUNCTION public.protect_transaction_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.period_id IS DISTINCT FROM OLD.period_id OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.proof_url IS DISTINCT FROM OLD.proof_url OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Transaction identity and payment details are immutable';
  END IF;
  IF OLD.status <> 'pending' OR OLD.method <> 'qris'
     OR NEW.status NOT IN ('approved', 'rejected')
     OR NEW.verified_by IS DISTINCT FROM auth.uid() OR NEW.verified_by = OLD.user_id
     OR NOT public.has_role('keuangan') THEN
    RAISE EXCEPTION 'Invalid payment status transition';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_transaction_updates ON public.cash_transactions;
CREATE TRIGGER protect_transaction_updates BEFORE UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.protect_transaction_updates();

-- Role permissions: wali kelas can maintain periods and the initial finance experience.
DROP POLICY IF EXISTS "Officers manage cash periods" ON public.cash_periods;
CREATE POLICY "Finance and homeroom manage cash periods"
ON public.cash_periods FOR ALL TO authenticated
USING (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer'))
WITH CHECK (public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cash_transactions
    WHERE type = 'income' AND status IN ('pending', 'approved') AND period_id IS NOT NULL
    GROUP BY user_id, period_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Resolve duplicate pending/approved income per student/period before applying migration 0012';
  END IF;
END;
$$;

CREATE UNIQUE INDEX one_active_income_per_period_and_student
ON public.cash_transactions (user_id, period_id)
WHERE type = 'income' AND status IN ('pending', 'approved') AND period_id IS NOT NULL;
